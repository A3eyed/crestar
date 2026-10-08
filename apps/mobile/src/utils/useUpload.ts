// @ts-nocheck
import * as React from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Helper function to resolve upload URL with validation
const resolveUploadUrl = () => {
  const uploadPath = '/api/upload';
  const baseURL =
    process.env.EXPO_PUBLIC_BASE_URL ||
    process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
    'https://crestarhq.com';

  // Ensure baseURL doesn't end with slash
  const cleanBase = baseURL.replace(/\/$/, '');

  // Validate the URL is properly formed
  const fullUrl = `${cleanBase}${uploadPath}`;

  // Log for debugging
  console.log('🔧 Resolved upload URL:', fullUrl);

  return fullUrl;
};

// Helper function to wait with timeout
const fetchWithTimeout = async (url, options, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please check your connection and try again.');
    }
    throw error;
  }
};

// Retry logic with exponential backoff
const retryableFetch = async (url, options, maxRetries = 2) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetchWithTimeout(url, options);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Upload attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors (client errors + 429 rate limiting)
      if (
        error.message.includes('400') ||
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('429')
      ) {
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
};

// Build headers required when bypassing the patched global fetch (native direct upload)
const buildNativeUploadHeaders = () => {
  const headers = {
    Accept: 'application/json',
  };

  if (process.env.EXPO_PUBLIC_PROJECT_GROUP_ID) {
    headers['x-createxyz-project-group-id'] = process.env.EXPO_PUBLIC_PROJECT_GROUP_ID;
  }
  if (process.env.EXPO_PUBLIC_HOST) {
    headers['host'] = process.env.EXPO_PUBLIC_HOST;
    headers['x-forwarded-host'] = process.env.EXPO_PUBLIC_HOST;
    headers['x-createxyz-host'] = process.env.EXPO_PUBLIC_HOST;
  }

  try {
    const { useAuthStore } = require('./auth/store');
    const { auth } = useAuthStore.getState();
    if (auth?.jwt) {
      headers['Authorization'] = `Bearer ${auth.jwt}`;
    }
  } catch (e) {
    console.warn('⚠️ Could not read auth token for upload:', e?.message);
  }

  return headers;
};

// Infer a mime type from the asset or its file extension
const inferMimeType = (asset) => {
  if (asset.mimeType) return asset.mimeType;
  const uri = asset.uri || '';
  const ext = uri.split('.').pop()?.toLowerCase()?.split('?')[0];
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    // Videos (Create flow posts feed videos through the same helper)
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
    '3gp': 'video/3gpp',
  };
  return map[ext] || 'image/jpeg';
};

// Convert a data: URI to a Blob without relying on fetch (web only).
// The web image picker and image manipulator return data:/blob: URIs, and
// converting data URIs directly avoids any patched-fetch edge cases.
const dataUriToBlob = (dataUri) => {
  const commaIndex = dataUri.indexOf(',');
  const header = dataUri.substring(0, commaIndex);
  const body = dataUri.substring(commaIndex + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  if (header.includes('base64')) {
    const byteString = atob(body);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([decodeURIComponent(body)], { type: mimeType });
};

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(null);

  const upload = React.useCallback(async (input, options = {}) => {
    const { onProgress } = options;

    try {
      setLoading(true);
      setProgress({
        status: 'preparing',
        progress: 0,
        message: 'Preparing upload...',
      });

      // Validate input
      if (!input) {
        throw new Error('No upload input provided');
      }

      let response;
      const uploadUrl = resolveUploadUrl();

      if ('reactNativeAsset' in input && input.reactNativeAsset) {
        let asset = input.reactNativeAsset;

        // 🛡️ Validate that asset is not a string (URL from previous upload)
        if (typeof asset === 'string') {
          console.error('❌ reactNativeAsset is a string (URL):', asset.substring(0, 100));
          throw new Error('Cannot upload a URL string as an asset. Please select a new image.');
        }

        // Validate asset
        if (!asset.uri) {
          console.error('❌ Asset missing URI. Asset:', asset);
          throw new Error('Invalid asset: missing URI');
        }

        setProgress({
          status: 'uploading',
          progress: 20,
          message: 'Uploading image...',
        });
        if (onProgress) onProgress({ status: 'uploading', progress: 20 });

        // ─── NATIVE (iOS/Android): stream file from disk via multipart ───
        // This is the reliable path for real devices (TestFlight / Expo Go).
        // The old approach (fetch(uri).blob() + FormData) silently breaks on
        // native and only worked in the web preview.
        if (Platform.OS !== 'web') {
          const mimeType = inferMimeType(asset);
          const headers = buildNativeUploadHeaders();

          console.log('📤 Native upload via FileSystem.createUploadTask:', {
            url: uploadUrl,
            mimeType,
          });

          let nativeResult = null;
          let nativeError = null;

          try {
            // Real byte-level progress — smooth TikTok-style progress bar
            const uploadTask = FileSystem.createUploadTask(
              uploadUrl,
              asset.uri,
              {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file',
                mimeType,
                headers,
              },
              (progressEvent) => {
                const { totalBytesSent, totalBytesExpectedToSend } = progressEvent;
                if (totalBytesExpectedToSend > 0) {
                  // Map raw byte progress into the 15–90% band
                  // (the last stretch is reserved for server processing)
                  const ratio = totalBytesSent / totalBytesExpectedToSend;
                  const percent = Math.min(90, Math.round(15 + ratio * 75));
                  setProgress({
                    status: 'uploading',
                    progress: percent,
                    message: 'Uploading...',
                  });
                  if (onProgress) {
                    onProgress({ status: 'uploading', progress: percent });
                  }
                }
              }
            );

            nativeResult = await uploadTask.uploadAsync();
            console.log('📡 Native upload response status:', nativeResult?.status);
          } catch (err) {
            nativeError = err;
            console.warn('⚠️ Native multipart upload failed:', err?.message);
          }

          // Success path
          if (nativeResult && nativeResult.status >= 200 && nativeResult.status < 300) {
            let data;
            try {
              data = JSON.parse(nativeResult.body);
            } catch (e) {
              data = null;
            }

            if (data?.url) {
              setProgress({
                status: 'complete',
                progress: 100,
                message: 'Upload complete!',
              });
              if (onProgress) onProgress({ status: 'complete', progress: 100 });

              console.log('✅ Native upload successful:', data.url);
              return { url: data.url, mimeType: data.mimeType || null };
            }
            console.warn('⚠️ Native upload returned 2xx but no URL — falling back');
          }

          // Capture any server-provided error message so we can surface it
          // if the fallback also fails (helps debugging real validation errors
          // like "file too large" or "invalid file type").
          let directUploadErrorMessage = null;
          if (nativeResult && nativeResult.status >= 400) {
            directUploadErrorMessage = `Upload failed with status ${nativeResult.status}`;
            try {
              const errData = JSON.parse(nativeResult.body);
              directUploadErrorMessage =
                errData.error || errData.message || directUploadErrorMessage;
            } catch (e) {
              // keep default message
            }
            console.warn('⚠️ Direct upload rejected:', directUploadErrorMessage);
          }

          // 🚫 429 = rate limited: fail immediately. No retry, no base64
          // fallback — another request would only make the rate limiting worse.
          if (nativeResult && nativeResult.status === 429) {
            const rateLimitMessage =
              'Too many uploads right now. Please wait a moment and try again.';
            console.error('❌ Upload rate limited (429) — not retrying');
            setProgress({ status: 'error', progress: 0, message: rateLimitMessage });
            if (onProgress) onProgress({ status: 'error', progress: 0, message: rateLimitMessage });
            return { error: rateLimitMessage };
          }

          // ─── FALLBACK: base64 JSON upload through the patched global fetch ───
          // The patched fetch automatically attaches the platform routing +
          // auth headers, so this path works in Expo Go, TestFlight, and
          // production even when the direct multipart request is rejected
          // (e.g. 4xx from the dev proxy due to missing routing headers).
          console.log('🔄 Falling back to base64 upload...');
          setProgress({
            status: 'uploading',
            progress: 40,
            message: 'Retrying upload...',
          });
          if (onProgress) onProgress({ status: 'uploading', progress: 40 });

          try {
            const isVideo = mimeType.startsWith('video/');
            const info = await FileSystem.getInfoAsync(asset.uri);
            // Backend body limit is 4.5MB; base64 inflates ~33%.
            // Videos can't squeeze through this fallback at all beyond ~3MB,
            // so surface a clear message instead of a misleading one.
            if (info.exists && info.size > 3 * 1024 * 1024) {
              if (isVideo) {
                throw new Error(
                  directUploadErrorMessage ||
                    'Video upload failed. Please check your connection and try again.'
                );
              }
              throw new Error('Image file is too large. Please try a smaller image.');
            }

            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const dataUri = `data:${mimeType};base64,${base64}`;

            // Goes through the patched global fetch → auth headers auto-added
            response = await retryableFetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({ base64: dataUri }),
            });

            console.log('📡 Base64 fallback response status:', response.status);
          } catch (fallbackError) {
            console.error('❌ Base64 fallback failed:', fallbackError?.message);
            // Prefer the clearest error message available
            const finalMessage =
              directUploadErrorMessage ||
              fallbackError?.message ||
              nativeError?.message ||
              'Upload failed. Please try again.';
            throw new Error(finalMessage);
          }
        } else {
          // ─── WEB: read the file data into a proper Blob ───
          console.log('🔄 Reading file data from URI (web)...');

          let blob;
          if (typeof asset.uri === 'string' && asset.uri.startsWith('data:')) {
            // Convert data URIs directly — no fetch involved, cannot be
            // affected by the patched network layer.
            blob = dataUriToBlob(asset.uri);
          } else {
            const fileResponse = await fetch(asset.uri);
            if (!fileResponse.ok) {
              throw new Error(`Failed to read file: ${fileResponse.status}`);
            }
            blob = await fileResponse.blob();
          }

          if (!blob || blob.size === 0) {
            throw new Error('Selected image could not be read. Please try a different image.');
          }

          console.log('✅ File blob created, size:', blob.size);

          const formData = new FormData();

          // Extract filename from URI and ensure it has a proper extension
          const uriParts = asset.uri.split('/');
          let fileName = uriParts[uriParts.length - 1] || `upload_${Date.now()}`;

          const hasExtension =
            fileName.includes('.') && fileName.lastIndexOf('.') > fileName.lastIndexOf('/');

          if (!hasExtension) {
            const mimeType = asset.mimeType || blob.type || 'image/jpeg';
            const extensionMap = {
              'image/jpeg': '.jpg',
              'image/jpg': '.jpg',
              'image/png': '.png',
              'image/webp': '.webp',
              'image/heic': '.heic',
              'image/heif': '.heif',
              'image/gif': '.gif',
              'image/bmp': '.bmp',
              'image/tiff': '.tiff',
            };
            const extension = extensionMap[mimeType.toLowerCase()] || '.jpg';
            fileName = `${fileName}${extension}`;
          }

          formData.append('file', blob, fileName);

          response = await retryableFetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json',
            },
          });

          console.log('📡 Upload response status:', response.status);
        }

        setProgress({
          status: 'uploading',
          progress: 80,
          message: 'Processing upload...',
        });
        if (onProgress) onProgress({ status: 'uploading', progress: 80 });
      } else if ('url' in input) {
        if (!input.url) {
          throw new Error('Invalid input: missing URL');
        }

        setProgress({
          status: 'uploading',
          progress: 40,
          message: 'Processing URL...',
        });
        if (onProgress) onProgress({ status: 'uploading', progress: 40 });

        response = await retryableFetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ url: input.url }),
        });

        console.log('📡 Upload response status:', response.status);
      } else if ('base64' in input) {
        if (!input.base64) {
          throw new Error('Invalid input: missing base64 data');
        }

        setProgress({
          status: 'uploading',
          progress: 40,
          message: 'Processing image...',
        });
        if (onProgress) onProgress({ status: 'uploading', progress: 40 });

        response = await retryableFetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ base64: input.base64 }),
        });

        console.log('📡 Upload response status:', response.status);
      } else if ('buffer' in input) {
        if (!input.buffer) {
          throw new Error('Invalid input: missing buffer data');
        }

        setProgress({
          status: 'uploading',
          progress: 40,
          message: 'Uploading data...',
        });
        if (onProgress) onProgress({ status: 'uploading', progress: 40 });

        response = await retryableFetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Accept: 'application/json',
          },
          body: input.buffer,
        });

        console.log('📡 Upload response status:', response.status);
      } else {
        throw new Error('Invalid upload input format');
      }

      // Handle non-OK responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        const errorMessage =
          errorData.error || errorData.message || `Upload failed with status ${response.status}`;

        console.error('❌ Upload failed:', errorMessage);
        console.error('📊 Response status:', response.status);
        console.error('📋 Error data:', errorData);

        setProgress({
          status: 'error',
          progress: 0,
          message: errorMessage,
        });
        if (onProgress) onProgress({ status: 'error', progress: 0, message: errorMessage });

        return { error: errorMessage };
      }

      setProgress({
        status: 'uploading',
        progress: 90,
        message: 'Finalizing...',
      });
      if (onProgress) onProgress({ status: 'uploading', progress: 90 });

      // Parse response with validation
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Invalid response format from server');
      }

      // Validate response data
      if (!data.url) {
        throw new Error('Server response missing upload URL');
      }

      setProgress({
        status: 'complete',
        progress: 100,
        message: 'Upload complete!',
      });
      if (onProgress) onProgress({ status: 'complete', progress: 100 });

      console.log('✅ Upload successful:', data.url);

      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.error('📋 Error details:', uploadError.message);
      console.error('🔍 Error stack:', uploadError.stack);

      let errorMessage = 'Upload failed. Please try again.';

      if (uploadError instanceof Error) {
        errorMessage = uploadError.message;
      } else if (typeof uploadError === 'string') {
        errorMessage = uploadError;
      }

      // Provide helpful error messages
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timed out')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
      } else if (errorMessage.includes('abort')) {
        errorMessage = 'Upload was cancelled. Please try again.';
      }

      setProgress({
        status: 'error',
        progress: 0,
        message: errorMessage,
      });
      if (onProgress) onProgress({ status: 'error', progress: 0, message: errorMessage });

      return { error: errorMessage };
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(null), 3000);
    }
  }, []);

  return [upload, { loading, progress }];
}

export { useUpload };
export default useUpload;
