// Same base64-data-URI approach as upload.controller.js, kept separate
// since notice attachments accept PDFs/docs in addition to images.
const handleAttachmentUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No attachment file received' });
  }

  const base64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${base64}`;

  res.json({ attachmentUrl: dataUri, attachmentName: req.file.originalname });
};

module.exports = { handleAttachmentUpload };
