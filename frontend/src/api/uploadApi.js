import axiosClient from './axiosClient';

// Uploads the image to our own backend, which converts it to a base64
// data URI and stores it directly in MongoDB - no third-party file
// storage service or API key needed. The returned string is used exactly
// like a normal image URL (works fine in an <img src="..."> tag).
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axiosClient.post('/upload/image', formData);
  return response.data.imageUrl;
}
