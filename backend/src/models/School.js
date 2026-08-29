const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    eiin: { type: String, required: true, unique: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // ---- Institution identity (School Profile module) ----
    institutionCode: { type: String, trim: true },
    establishmentYear: { type: Number },

    address: { type: String, required: true },

    // Primary contact info (required, used everywhere phone/email is shown)
    // plus optional extra numbers/addresses for departments, emergencies, etc.
    phone: { type: String, required: true },
    additionalPhones: [{ type: String, trim: true }],
    email: { type: String, required: true, lowercase: true },
    additionalEmails: [{ type: String, trim: true, lowercase: true }],
    emergencyContact: { type: String, trim: true },

    // ---- Contact verification (School Profile module) ----
    // Verified flags apply only to the *primary* phone/email. If the
    // primary value is changed, the corresponding flag is reset - a
    // verification badge should never survive a silent field change.
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    // One-time codes are excluded from normal queries (select: false) so
    // they never leak out through the regular profile/public endpoints.
    phoneVerificationCode: { type: String, select: false },
    phoneVerificationExpires: { type: Date, select: false },
    emailVerificationCode: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    principalName: { type: String },
    principalMessage: { type: String },
    logoUrl: { type: String },
    bannerUrl: { type: String },
    welcomeMessage: { type: String, default: '' },
    socialLinks: [{ platform: String, url: String }],
    academicCalendar: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
        description: { type: String },
      },
    ],
    // Used to plot the school on OpenStreetMap and generate directions links
    location: {
      lat: { type: Number },
      lng: { type: Number },
      displayAddress: { type: String }, // human-readable label returned by the geocoder
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'standard', 'premium'],
      default: 'free',
    },

    // Timestamp of the last time an admin edited the profile fields below.
    // Shown in the UI so admins/stakeholders can see the info is current.
    profileUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
