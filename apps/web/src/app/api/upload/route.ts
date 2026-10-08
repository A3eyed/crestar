// @ts-nocheck
import { upload } from '@/app/api/utils/upload';

// 🔒 File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB for videos

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

// 🎬 Videos are allowed too — Crestar's Create flow posts feed videos
const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
];

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
];

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.3gp', '.avi', '.mpg', '.mpeg'];

const isVideoMime = (mime) => !!mime && ALLOWED_VIDEO_MIME_TYPES.includes(mime.toLowerCase());

/**
 * 🛡️ Validate file type and size (images AND videos)
 */
function validateFile(file, buffer) {
  const mime = file.type ? file.type.toLowerCase() : null;
  const extension = file.name
    ? file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    : null;
  const isVideo = isVideoMime(mime) || (extension && ALLOWED_VIDEO_EXTENSIONS.includes(extension));

  // Check file size — videos get a larger allowance
  const fileSize = buffer ? buffer.length : file.size;
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  if (fileSize > sizeLimit) {
    throw new Error(`File too large. Maximum size is ${sizeLimit / 1024 / 1024}MB`);
  }

  // Check MIME type (images or videos)
  if (mime && !ALLOWED_MIME_TYPES.includes(mime) && !isVideoMime(mime)) {
    throw new Error(
      `Invalid file type: ${file.type}. Only images (JPEG, PNG, WebP, HEIC, GIF, BMP, TIFF) and videos (MP4, MOV, WebM) are allowed`
    );
  }

  // Check file extension (images or videos)
  if (extension) {
    if (!ALLOWED_EXTENSIONS.includes(extension) && !ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
      throw new Error(
        `Invalid file extension: ${extension}. Only image and video files are allowed`
      );
    }
  }

  return true;
}

/**
 * 🛡️ Validate base64 data (images AND videos)
 */
function validateBase64(base64String) {
  let isVideo = false;

  // Check if it's a data URI with MIME type
  if (base64String.startsWith('data:')) {
    const mimeMatch = base64String.match(/data:([^;]+);/);
    if (mimeMatch) {
      const mimeType = mimeMatch[1].toLowerCase();
      isVideo = isVideoMime(mimeType);
      if (!ALLOWED_MIME_TYPES.includes(mimeType) && !isVideo) {
        throw new Error(
          `Invalid file type: ${mimeType}. Only images (JPEG, PNG, WebP, HEIC, GIF, BMP, TIFF) and videos (MP4, MOV, WebM) are allowed`
        );
      }
    }
  }

  // Estimate size (base64 is ~33% larger than original)
  const estimatedSize = (base64String.length * 3) / 4;
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  if (estimatedSize > sizeLimit) {
    throw new Error(`File too large. Maximum size is ${sizeLimit / 1024 / 1024}MB`);
  }

  return true;
}

export async function POST(request) {
  try {
    console.log('📤 Upload API endpoint called');

    const contentType = request.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);

    let uploadResult;

    // Handle FormData uploads (from React Native)
    if (contentType?.includes('multipart/form-data')) {
      console.log('📦 Processing FormData upload...');

      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        console.error('❌ No file found in FormData');
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }

      console.log('🔍 File object received from FormData:', {
        type: typeof file,
        constructor: file?.constructor?.name,
        isString: typeof file === 'string',
        stringValue: typeof file === 'string' ? file.substring(0, 100) : 'N/A',
        hasName: !!file?.name,
        hasType: !!file?.type,
        hasSize: !!file?.size,
        hasUri: !!file?.uri,
        keys: file && typeof file === 'object' ? Object.keys(file).slice(0, 15) : 'not an object',
      });

      // 🛡️ Check if FormData stringified the object to "[object Object]"
      // This happens when React Native sends a plain object to FormData
      if (typeof file === 'string' && file === '[object Object]') {
        console.error("❌ FormData stringified the file object to '[object Object]'");
        console.error('💡 This means React Native sent a plain object instead of a File/Blob');
        return Response.json(
          {
            error:
              'Invalid file format. The file object was not properly formatted. Please try again.',
          },
          { status: 400 }
        );
      }

      console.log('📁 File received:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Debug: Log available methods on the file object
      console.log('🔍 File object methods:', {
        hasArrayBuffer: typeof file.arrayBuffer === 'function',
        hasBytes: typeof file.bytes === 'function',
        hasText: typeof file.text === 'function',
        hasStream: typeof file.stream === 'function',
        isBuffer: file instanceof Buffer,
        isString: typeof file === 'string',
        constructor: file.constructor?.name,
      });

      // Convert file to buffer - handle both web File objects and React Native files
      let buffer;
      let fileMetadata = { name: file.name, type: file.type };

      try {
        // ✅ PRODUCTION FIX: Try-catch for React Native where arrayBuffer exists but isn't callable
        if (typeof file.arrayBuffer === 'function') {
          try {
            console.log('📦 Using arrayBuffer() method (Web File API)');
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            console.log('✅ Buffer created from arrayBuffer(), size:', buffer.length);

            // ⚠️ Check if buffer was created but is empty
            if (buffer && buffer.length === 0) {
              console.warn('⚠️ arrayBuffer() returned empty buffer, trying alternative methods');
              buffer = null; // Reset to try other methods
            }
          } catch (arrayBufferError) {
            console.log(
              '⚠️ arrayBuffer() failed (React Native production):',
              arrayBufferError.message
            );
            // Fall through to React Native handling below
          }
        }

        // Try stream method as backup for empty arrayBuffer
        if (!buffer && typeof file.stream === 'function') {
          console.log('📦 Trying stream() method due to empty/failed arrayBuffer');
          const stream = file.stream();
          const chunks = [];
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
          console.log('✅ Buffer created from stream(), size:', buffer.length);
        }

        // Check if this is a plain string URI (from React Native)
        if (
          !buffer &&
          typeof file === 'string' &&
          (file.startsWith('file://') || file.startsWith('http://') || file.startsWith('https://'))
        ) {
          console.log('📱 Detected plain string URI from React Native');
          console.log('📋 URI:', file.substring(0, 100) + '...');

          // Fetch the file from the URI
          console.log('🔄 Fetching file from URI...');
          const fileResponse = await fetch(file);

          if (!fileResponse.ok) {
            throw new Error(
              `Failed to fetch file from URI: ${fileResponse.status} ${fileResponse.statusText}`
            );
          }

          const arrayBuffer = await fileResponse.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log('✅ Successfully fetched file from URI, size:', buffer.length);

          // Try to infer MIME type from response headers
          const contentTypeHeader = fileResponse.headers.get('content-type');
          if (contentTypeHeader) {
            fileMetadata.type = contentTypeHeader;
            console.log('📋 Inferred MIME type from response:', contentTypeHeader);
          }

          // Try to infer filename from URI
          const uriParts = file.split('/');
          const lastPart = uriParts[uriParts.length - 1];
          if (lastPart && lastPart.includes('.')) {
            fileMetadata.name = lastPart.split('?')[0]; // Remove query params
            console.log('📋 Inferred filename from URI:', fileMetadata.name);
          }
        }
        // Check if this is a React Native file object with uri property
        else if (!buffer && file.uri && typeof file.uri === 'string' && !file.arrayBuffer) {
          console.log('📱 Detected React Native file format with URI');
          console.log('📋 File details:', {
            uri: file.uri.substring(0, 100),
            type: file.type,
            name: file.name,
          });

          // Fetch the file from the URI
          console.log('🔄 Fetching file from URI...');
          const fileResponse = await fetch(file.uri);

          if (!fileResponse.ok) {
            throw new Error(
              `Failed to fetch file from URI: ${fileResponse.status} ${fileResponse.statusText}`
            );
          }

          const arrayBuffer = await fileResponse.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log('✅ Successfully fetched file from URI, size:', buffer.length);
        }
        // Check if file has numeric keys (serialized array/buffer from React Native)
        else if (
          !buffer &&
          typeof file === 'object' &&
          Object.keys(file).every((key) => !isNaN(key))
        ) {
          console.log('📱 Detected serialized buffer with numeric keys');
          console.log('📋 Converting numeric keys to buffer...');

          // Convert the object with numeric keys back to a buffer
          const keys = Object.keys(file)
            .map(Number)
            .sort((a, b) => a - b);
          const bytes = keys.map((key) => file[key]);
          buffer = Buffer.from(bytes);

          console.log('✅ Successfully converted to buffer, size:', buffer.length);
        }
        // Check for other methods
        else if (!buffer && typeof file.bytes === 'function') {
          console.log('📦 Using bytes() method');
          const bytes = await file.bytes();
          buffer = Buffer.from(bytes);
          console.log('✅ Buffer created from bytes(), size:', buffer.length);
        } else if (!buffer && file instanceof Buffer) {
          console.log('📦 File is already a Buffer');
          buffer = file;
          console.log('✅ Using existing Buffer, size:', buffer.length);
        } else if (!buffer && typeof file.text === 'function') {
          console.log('📦 Using text() method');
          const text = await file.text();
          buffer = Buffer.from(text, 'binary');
          console.log('✅ Buffer created from text(), size:', buffer.length);
        } else if (!buffer) {
          // Last resort: check if file has a buffer property or is array-like
          console.log('📦 Attempting fallback methods');
          console.log('📋 File object keys:', Object.keys(file).slice(0, 20));
          console.log(
            '📋 File prototype methods:',
            Object.getOwnPropertyNames(Object.getPrototypeOf(file))
          );

          if (file.buffer) {
            buffer = Buffer.from(file.buffer);
            console.log('✅ Buffer created from file.buffer, size:', buffer.length);
          } else if (file.data) {
            buffer = Buffer.from(file.data);
            console.log('✅ Buffer created from file.data, size:', buffer.length);
          } else {
            throw new Error(
              `Unsupported file object type: ${file.constructor?.name}. Available properties: ${Object.keys(file).join(', ')}`
            );
          }
        }

        // ✅ Final validation: ensure buffer is not empty
        if (!buffer || buffer.length === 0) {
          console.error('❌ Buffer is empty after all conversion attempts');
          console.error('📋 File object:', {
            type: typeof file,
            constructor: file?.constructor?.name,
            size: file?.size,
            hasArrayBuffer: typeof file?.arrayBuffer === 'function',
            keys: file && typeof file === 'object' ? Object.keys(file).slice(0, 20) : [],
          });
          throw new Error(
            'Failed to create buffer from file - buffer is empty. File may be corrupted or invalid.'
          );
        }

        console.log('✅ Buffer created successfully, size:', buffer.length);
      } catch (bufferError) {
        console.error('❌ Error converting file to buffer:', bufferError);
        console.error('📋 Buffer error details:', bufferError.message);
        console.error('📋 File type:', typeof file);
        console.error('📋 File object keys:', Object.keys(file).slice(0, 20));
        return Response.json(
          { error: 'Failed to process file data: ' + bufferError.message },
          { status: 400 }
        );
      }

      // 🔒 Validate file type and size
      try {
        validateFile(fileMetadata, buffer);
        console.log('✅ File validation passed');
      } catch (validationError) {
        console.error('❌ File validation failed:', validationError.message);
        return Response.json({ error: validationError.message }, { status: 400 });
      }

      console.log('🔄 Uploading to CDN...');
      uploadResult = await upload({ buffer });

      // ✅ Validate upload result before proceeding
      if (!uploadResult || !uploadResult.url) {
        console.error('❌ CDN upload failed - no URL returned');
        return Response.json(
          { error: 'CDN upload failed - no URL returned from upload service' },
          { status: 500 }
        );
      }

      console.log('✅ CDN upload successful:', uploadResult.url);
    }
    // Handle JSON uploads (URL or base64)
    else if (contentType?.includes('application/json')) {
      console.log('📝 Processing JSON upload...');

      const body = await request.json();

      if (body.url) {
        console.log('🌐 Uploading from URL:', body.url);
        // Note: URL validation happens after download in the upload utility
        uploadResult = await upload({ url: body.url });
      } else if (body.base64) {
        console.log('📸 Uploading base64 data');

        // 🔒 Validate base64 data
        try {
          validateBase64(body.base64);
          console.log('✅ Base64 validation passed');
        } catch (validationError) {
          console.error('❌ Base64 validation failed:', validationError.message);
          return Response.json({ error: validationError.message }, { status: 400 });
        }

        uploadResult = await upload({ base64: body.base64 });
      } else {
        console.error('❌ Invalid JSON body - no url or base64');
        return Response.json({ error: 'Must provide either url or base64' }, { status: 400 });
      }

      // ✅ Validate upload result before proceeding
      if (!uploadResult || !uploadResult.url) {
        console.error('❌ CDN upload failed - no URL returned');
        return Response.json(
          { error: 'CDN upload failed - no URL returned from upload service' },
          { status: 500 }
        );
      }

      console.log('✅ CDN upload successful:', uploadResult.url);
    }
    // Handle binary uploads
    else if (contentType?.includes('application/octet-stream')) {
      console.log('🔢 Processing binary upload...');

      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 🔒 Validate file size for binary uploads (video limit — type unknown)
      if (buffer.length > MAX_VIDEO_SIZE) {
        console.error('❌ Binary file too large');
        return Response.json(
          {
            error: `File too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
          },
          { status: 400 }
        );
      }

      console.log('🔄 Uploading to CDN...');
      uploadResult = await upload({ buffer });

      // ✅ Validate upload result before proceeding
      if (!uploadResult || !uploadResult.url) {
        console.error('❌ CDN upload failed - no URL returned');
        return Response.json(
          { error: 'CDN upload failed - no URL returned from upload service' },
          { status: 500 }
        );
      }

      console.log('✅ CDN upload successful:', uploadResult.url);
    } else {
      console.error('❌ Unsupported content type:', contentType);
      return Response.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 });
    }

    console.log('✅ Upload complete, returning URL:', uploadResult.url);

    return Response.json({
      url: uploadResult.url,
      mimeType: uploadResult.mimeType,
    });
  } catch (error) {
    console.error('❌ Upload API error:', error);
    console.error('📋 Error stack:', error.stack);

    return Response.json(
      {
        error: error.message || 'Upload failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
