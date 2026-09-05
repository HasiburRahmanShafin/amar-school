const UPLOADCARE_PUBLIC_KEY = process.env.REACT_APP_UPLOADCARE_PUBLIC_KEY;
const UPLOADCARE_UPLOAD_URL = 'https://upload.uploadcare.com/base/';

/**
 * Uploads a single File directly from the browser to Uploadcare
 * (file bytes never touch our own backend).
 * Returns the public CDN url string, e.g. "https://ucarecdn.com/<uuid>/"
 * or null if the upload failed.
 */
export default async function uploadToUploadcare(file) {
  if (!file) return null;
  if (!UPLOADCARE_PUBLIC_KEY) {
    console.error('REACT_APP_UPLOADCARE_PUBLIC_KEY is not set');
    return null;
  }

  const formData = new FormData();
  formData.append('UPLOADCARE_PUB_KEY', UPLOADCARE_PUBLIC_KEY);
  formData.append('UPLOADCARE_STORE', 'auto');
  formData.append('file', file);

  try {
    const response = await fetch(UPLOADCARE_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Uploadcare upload failed with status', response.status);
      return null;
    }

    const data = await response.json();
    if (!data?.file) return null;

    return `https://ucarecdn.com/${data.file}/`;
  } catch (err) {
    console.error('Uploadcare upload error:', err);
    return null;
  }
}
