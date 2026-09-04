const mongoose = require('mongoose');

// Every change made to a School Profile field is recorded here - both
// changes that took effect immediately (status: 'auto_approved') and
// changes to sensitive fields that had to go through Super Admin review
// (status: 'pending' -> 'approved' | 'rejected'). This is what powers
// the Version History tab and the Super Admin approval queue.
const profileChangeSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved'],
      default: 'pending',
      index: true,
    },

    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String },
    changedByRole: { type: String },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },

    // Set when this change was created by restoring an older history entry,
    // so the history view can label it accordingly.
    restoredFromChangeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfileChange' },
  },
  { timestamps: true }
);

profileChangeSchema.index({ school: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ProfileChange', profileChangeSchema);
