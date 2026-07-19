const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    eiin: { type: String, required: true, unique: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    principalName: { type: String },
    principalMessage: { type: String },
    logoUrl: { type: String },
    bannerUrl: { type: String },
    socialLinks: [{ platform: String, url: String }],
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
