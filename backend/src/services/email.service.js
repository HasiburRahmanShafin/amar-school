const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// ---------------------------------------------------------------------
// Transport selection
//
// Preferred: Gmail API via OAuth2 (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
// GMAIL_REFRESH_TOKEN, GMAIL_USER - see backend/.env.example). Falls back
// to Nodemailer over Gmail SMTP with an app password (EMAIL_USER/EMAIL_PASS)
// when any of the four OAuth2 vars are missing, e.g. in local dev.
// ---------------------------------------------------------------------

const hasGmailApiCreds = Boolean(
  process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_USER
);

let gmailApiClientPromise = null;

// Lazily builds the Gmail API client. googleapis is only required() here so
// environments that never configure the OAuth2 vars don't need the package
// installed at all - they just take the SMTP path below.
const getGmailApiClient = () => {
  if (!gmailApiClientPromise) {
    gmailApiClientPromise = (async () => {
      const { google } = require('googleapis');
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );
      oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
      return google.gmail({ version: 'v1', auth: oAuth2Client });
    })();
  }
  return gmailApiClientPromise;
};

// Gmail API's messages.send wants a base64url-encoded RFC 2822 message,
// not a JSON body - build the minimal MIME headers a plain HTML email needs.
const buildRawMessage = ({ to, subject, html }) => {
  const from = `"Amar School" <${process.env.GMAIL_USER}>`;
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    html,
  ];
  const message = messageParts.join('\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const sendViaGmailApi = async ({ to, subject, html }) => {
  const gmail = await getGmailApiClient();
  const raw = buildRawMessage({ to, subject, html });
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
  return { providerMessageId: response.data.id };
};

let smtpTransporter = null;
const getSmtpTransporter = () => {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return smtpTransporter;
};

const sendViaSmtp = async ({ to, subject, html }) => {
  const info = await getSmtpTransporter().sendMail({
    from: `"Amar School" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return { providerMessageId: info.messageId };
};

// Sends one email and always logs the attempt (sent or failed) to EmailLog
// for delivery tracking. Never throws - a notification email failing must
// never block the request that triggered it (admission, payment, etc.).
// `category` groups the send for the EmailLog (see model comment) and
// `school` (optional schoolId) scopes it for per-school delivery auditing.
//
// `dedupeKey`, when provided, makes the send idempotent: if an EmailLog row
// with that key already exists (a prior run of a daily reminder job already
// sent it), this call is skipped entirely and returns { success: true,
// skipped: true } without hitting the mail provider again. The uniqueness
// itself is enforced by EmailLog's sparse unique index, so this is safe
// even if two reminder-job runs overlap.
const sendEmail = async ({ to, subject, html, category = 'general', school = null, dedupeKey = null }) => {
  const transport = hasGmailApiCreds ? 'gmail_api' : 'smtp';

  if (dedupeKey) {
    const alreadySent = await EmailLog.findOne({ dedupeKey, status: 'sent' }).catch(() => null);
    if (alreadySent) {
      return { success: true, skipped: true };
    }
  }

  try {
    const { providerMessageId } = hasGmailApiCreds
      ? await sendViaGmailApi({ to, subject, html })
      : await sendViaSmtp({ to, subject, html });

    try {
      await EmailLog.create({ to, subject, category, school, status: 'sent', transport, providerMessageId, dedupeKey });
    } catch (logErr) {
      // A duplicate-key error here means another concurrent call already
      // logged this exact reminder as sent - the email itself went out
      // fine, so this isn't a failure, just a race we lost on the log write.
      if (logErr.code !== 11000) {
        console.error('EmailLog write failed:', logErr.message);
      }
    }

    return { success: true, providerMessageId };
  } catch (error) {
    console.error('Email send failed:', error.message);

    await EmailLog.create({ to, subject, category, school, status: 'failed', transport, error: error.message }).catch(
      (logErr) => console.error('EmailLog write failed:', logErr.message)
    );

    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
