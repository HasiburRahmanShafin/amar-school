const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    category: {
      type: String,
      enum: ['facilities', 'events', 'activities'],
      default: 'facilities',
    },
  },
  { timestamps: true }
);

// Every gallery query in the app filters by school, so index it for speed
gallerySchema.index({ school: 1, createdAt: -1 });

module.exports = mongoose.model('Gallery', gallerySchema);
