const axios = require('axios');

const UPLOADCARE_PUBLIC_KEY = process.env.UPLOADCARE_PUBLIC_KEY;
const UPLOADCARE_SECRET_KEY = process.env.UPLOADCARE_SECRET_KEY;
const UPLOADCARE_API_BASE = 'https://api.uploadcare.com';

const authHeader = `Uploadcare.Simple ${UPLOADCARE_PUBLIC_KEY}:${UPLOADCARE_SECRET_KEY}`;

/**
 * Extracts the file UUID from a full Uploadcare CDN URL.
 * e.g. "https://ucarecdn.com/1a2b3c4d-.../" -> "1a2b3c4d-..."
 */
const extractUuid = (cdnUrl) => {
  if (!cdnUrl) return null;
  const match = cdnUrl.match(/ucarecdn\.com\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
};

/**
 * Marks a single uploaded file as permanent ("stored") so it survives
 * beyond Uploadcare's default temporary-file retention window.
 * Safe to call even if the file is already stored.
 */
const storeFile = async (uuid) => {
  if (!uuid) return null;
  const response = await axios.put(
    `${UPLOADCARE_API_BASE}/files/${uuid}/storage/`,
    {},
    {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.uploadcare-v0.7+json',
      },
    }
  );
  return response.data;
};

/**
 * Batch-stores multiple files by UUID in a single API call.
 * Preferred over calling storeFile() in a loop when there are
 * several documents in one submission (e.g. birth cert + report card + others).
 */
const storeFiles = async (uuids) => {
  const validUuids = uuids.filter(Boolean);
  if (validUuids.length === 0) return null;

  const response = await axios.put(
    `${UPLOADCARE_API_BASE}/files/storage/`,
    { paths: validUuids },
    {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.uploadcare-v0.7+json',
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

/**
 * Given the `documents` array saved on an Applicant
 * ([{ label, url }, ...]), extracts UUIDs and stores all of them.
 * Best-effort: failures are logged, never thrown, so a hiccup here
 * never blocks the applicant's submission.
 */
const storeApplicationDocuments = async (documents = []) => {
  try {
    const uuids = documents.map((doc) => extractUuid(doc.url));
    await storeFiles(uuids);
  } catch (error) {
    console.error('Uploadcare: failed to store application documents', error.response?.data || error.message);
  }
};

module.exports = {
  extractUuid,
  storeFile,
  storeFiles,
  storeApplicationDocuments,
};
