// Validation helpers for School Profile Management.
// Each function returns null when the value is valid, or a short
// human-readable error message when it isn't - so callers can just do:
//   const err = isValidEmail(value); if (err) errors.email = err;

const EIIN_REGEX = /^\d{5,7}$/; // Bangladeshi EIIN numbers are 5-7 digits
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX, optionally prefixed with +880 or 0
const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

const KNOWN_SOCIAL_DOMAINS = {
  facebook: ['facebook.com', 'fb.com'],
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
  twitter: ['twitter.com', 'x.com'],
  x: ['twitter.com', 'x.com'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
};

function isValidEIIN(value) {
  if (!value || !String(value).trim()) return 'EIIN is required';
  if (!EIIN_REGEX.test(String(value).trim())) {
    return 'EIIN must be a 5-7 digit number';
  }
  return null;
}

function isValidEmail(value) {
  if (!value || !String(value).trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(String(value).trim())) {
    return 'Enter a valid email address';
  }
  return null;
}

function isValidOptionalEmail(value) {
  if (!value || !String(value).trim()) return null;
  return isValidEmail(value);
}

function isValidBDPhone(value) {
  if (!value || !String(value).trim()) return 'Phone number is required';
  if (!BD_PHONE_REGEX.test(String(value).trim().replace(/[\s-]/g, ''))) {
    return 'Enter a valid Bangladeshi phone number (e.g. 01XXXXXXXXX)';
  }
  return null;
}

function isValidOptionalBDPhone(value) {
  if (!value || !String(value).trim()) return null;
  return isValidBDPhone(value);
}

function isNonEmpty(value, label) {
  if (!value || !String(value).trim()) return `${label} is required`;
  return null;
}

// Checks that a social link's URL plausibly belongs to the platform named.
// Unknown platforms are allowed through (schools can list "Other" channels),
// but a URL must at least look like a URL.
function isValidSocialLink(link) {
  if (!link || !link.url || !String(link.url).trim()) {
    return 'Link URL is required';
  }
  let hostname;
  try {
    hostname = new URL(link.url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return 'Enter a valid URL (starting with http:// or https://)';
  }

  const platformKey = (link.platform || '').trim().toLowerCase();
  const expectedDomains = KNOWN_SOCIAL_DOMAINS[platformKey];
  if (expectedDomains && !expectedDomains.some((domain) => hostname.endsWith(domain))) {
    return `This URL doesn't look like a ${link.platform} link`;
  }
  return null;
}

// Fields where a change is significant enough (publicly displayed identity,
// legal/registration info) that it must be reviewed and approved by a
// Super Admin before it goes live, rather than applying instantly.
const SENSITIVE_FIELDS = ['name', 'eiin', 'principalName', 'address'];

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

module.exports = {
  isValidEIIN,
  isValidEmail,
  isValidOptionalEmail,
  isValidBDPhone,
  isValidOptionalBDPhone,
  isNonEmpty,
  isValidSocialLink,
  SENSITIVE_FIELDS,
  generateVerificationCode,
};
