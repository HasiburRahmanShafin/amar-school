const axios = require('axios');

const UPLOADCARE_PUBLIC_KEY = process.env.UPLOADCARE_PUBLIC_KEY;
const UPLOADCARE_SECRET_KEY = process.env.UPLOADCARE_SECRET_KEY;

/**
 * Extracts the Uploadcare file uuid from a CDN url like
 * "https://ucarecdn.com/<uuid>/" — returns null if it doesn't look like one.
 */
function extractUuid(cdnUrl) {
  if (!cdnUrl) return null;
  const match = cdnUrl.match(/ucarecdn\.com\/([a-f0-9-]{36})\//i);
  return match ? match[1] : null;
}

/**
 * Confirms a given Uploadcare CDN url corresponds to a real, fully-processed
 * file in our Uploadcare project. Since /admissions/apply is a PUBLIC,
 * unauthenticated endpoint, this stops someone from POSTing a made-up url
 * without ever actually uploading a file.
 */
async function verifyUploadcareUrl(cdnUrl) {
  const uuid = extractUuid(cdnUrl);
  if (!uuid) return false;

  try {
    const response = await axios.get(`https://api.uploadcare.com/files/${uuid}/`, {
      headers: {
        Accept: 'application/vnd.uploadcare-v0.7+json',
        Authorization: `Uploadcare.Simple ${UPLOADCARE_PUBLIC_KEY}:${UPLOADCARE_SECRET_KEY}`,
      },
    });
    return response.data?.is_ready === true;
  } catch (err) {
    return false;
  }
}

module.exports = { verifyUploadcareUrl };
