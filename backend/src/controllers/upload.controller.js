// Converts the uploaded image into a base64 data URI and hands it straight
// back to the frontend. Wherever the app needs an image "URL" - School.logoUrl,
// School.bannerUrl, Gallery.imageUrl - this string just gets saved and used
// directly in an <img src="..."> tag, exactly like a normal URL would be.
const handleImageUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file received' });
  }

  const base64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${base64}`;

  res.json({ imageUrl: dataUri });
};

module.exports = { handleImageUpload };
