export default async function uploadToUploadcare(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('UPLOADCARE_PUB_KEY', 'demopublickey'); // আপনার নিজের Uploadcare Public Key এখানে দিতে পারেন বা আগে যা ছিল
  formData.append('UPLOADCARE_STORE', '1');

  try {
    const response = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    return `https://ucarecdn.com/${data.file}/`;
  } catch (error) {
    console.error('Uploadcare error:', error);
    throw new Error('Failed to upload file to Uploadcare');
  }
}
