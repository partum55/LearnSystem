export async function deleteUploadThingFile(fileKey: string) {
  const response = await fetch('/api/uploadthing/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey }),
  });

  if (!response.ok) {
    let message = 'Failed to delete uploaded file.';
    try {
      const body = await response.json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error;
      }
    } catch {
      // Keep the default message when the server returns a non-JSON error.
    }
    throw new Error(message);
  }

  return response.json();
}
