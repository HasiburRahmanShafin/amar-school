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
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
