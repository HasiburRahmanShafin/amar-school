
const UPLOADCARE_PUBLIC_KEY = process.env.REACT_APP_UPLOADCARE_PUBLIC_KEY;

export default async function uploadToUploadcare(file) {
  if (!file) return null;

  if (!UPLOADCARE_PUBLIC_KEY) {
    throw new Error(
      'REACT_APP_UPLOADCARE_PUBLIC_KEY is missing. Check your client .env file and restart the dev server after adding it.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('UPLOADCARE_PUB_KEY', UPLOADCARE_PUBLIC_KEY);
  formData.append('UPLOADCARE_STORE', '1');

  try {
    const response = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Uploadcare response error:', response.status, errorText);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.file) {
      console.error('Uploadcare response missing file id:', data);
      throw new Error('Uploadcare did not return a file id');
    }

    return `https://ucarecdn.com/${data.file}/`;
  } catch (error) {
    console.error('Uploadcare error:', error);
    throw new Error(error.message || 'Failed to upload file to Uploadcare');
  }
}
