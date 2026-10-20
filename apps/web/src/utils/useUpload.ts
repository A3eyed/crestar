import React from 'react';

interface ReactNativeAsset {
	file?: File;
	uri: string;
	name?: string;
	mimeType?: string;
}

interface UploadInput {
	reactNativeAsset?: ReactNativeAsset;
	file?: File;
	url?: string;
	base64?: string;
	buffer?: Buffer;
}

interface UploadResult {
	url?: string;
	mimeType?: string | null;
	error?: string;
}

interface UploadHookResult {
	loading: boolean;
}

/** Prefer direct-to-R2 presign so Worker body limits and wrong MIME (.bin) are avoided. */
async function uploadFileViaPresign(file: File): Promise<UploadResult> {
	const contentType = file.type || 'application/octet-stream';
	const presignRes = await fetch('/api/upload/presign', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({
			contentType,
			folder: contentType.startsWith('video/') ? 'videos' : 'uploads',
		}),
	});
	if (!presignRes.ok) {
		const err = await presignRes.json().catch(() => ({}));
		throw new Error(err.error || `Could not prepare upload (${presignRes.status})`);
	}
	const signed = await presignRes.json();
	if (!signed.uploadUrl || !signed.publicUrl) {
		throw new Error('Invalid upload signature');
	}

	const putRes = await fetch(signed.uploadUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': signed.contentType || contentType,
			...(signed.headers || {}),
		},
		body: file,
	});
	if (!putRes.ok) {
		const detail = await putRes.text().catch(() => '');
		throw new Error(`Upload failed (${putRes.status}): ${detail.slice(0, 120)}`);
	}

	return { url: signed.publicUrl, mimeType: contentType };
}

function useUpload(): [(input: UploadInput) => Promise<UploadResult>, UploadHookResult] {
	const [loading, setLoading] = React.useState(false);
	const upload = React.useCallback(async (input: UploadInput): Promise<UploadResult> => {
		try {
			setLoading(true);

			// Web File → presigned R2 PUT (correct extension + content-type)
			if ('file' in input && input.file instanceof File) {
				try {
					return await uploadFileViaPresign(input.file);
				} catch (presignErr) {
					// Fallback to server /api/upload
					console.warn('[useUpload] presign failed, falling back:', presignErr);
					const formData = new FormData();
					formData.append('file', input.file);
					const response = await fetch('/api/upload', {
						method: 'POST',
						body: formData,
						credentials: 'include',
					});
					if (!response.ok) {
						if (response.status === 413) throw new Error('Upload failed: File too large.');
						const err = await response.json().catch(() => ({}));
						throw new Error(err.error || 'Upload failed');
					}
					const data = await response.json();
					return { url: data.url, mimeType: data.mimeType || input.file.type || null };
				}
			}

			if ('reactNativeAsset' in input && input.reactNativeAsset?.file instanceof File) {
				return await uploadFileViaPresign(input.reactNativeAsset.file);
			}

			let response: Response | undefined;
			if ('url' in input && input.url) {
				response = await fetch('/api/upload', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ url: input.url }),
				});
			} else if ('base64' in input && input.base64) {
				response = await fetch('/api/upload', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ base64: input.base64 }),
				});
			} else if (input.buffer) {
				response = await fetch('/api/upload', {
					method: 'POST',
					headers: { 'Content-Type': 'application/octet-stream' },
					credentials: 'include',
					body: input.buffer as unknown as BodyInit,
				});
			} else {
				throw new Error('No file provided');
			}

			if (!response?.ok) {
				if (response?.status === 413) throw new Error('Upload failed: File too large.');
				const err = await response?.json().catch(() => ({}));
				throw new Error(err?.error || 'Upload failed');
			}
			const data = await response.json();
			return { url: data.url, mimeType: data.mimeType || null };
		} catch (uploadError) {
			if (uploadError instanceof Error) {
				return { error: uploadError.message };
			}
			if (typeof uploadError === 'string') {
				return { error: uploadError };
			}
			return { error: 'Upload failed' };
		} finally {
			setLoading(false);
		}
	}, []);

	return [upload, { loading }];
}

export default useUpload;
