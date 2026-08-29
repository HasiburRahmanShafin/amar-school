const mongoose = require('mongoose');

// One period within a routine (e.g. "1st period - Math - Mr. Karim - 9:00-9:45 - Room 204")
const periodSchema = new mongoose.Schema(
  {
    periodNumber: { type: Number, required: true, min: 1 },
    subject: { type: String, required: true, trim: true },
    teacherName: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true }, // "09:00" (24h, simple string like Notice's date handling)
    endTime: { type: String, required: true, trim: true }, // "09:45"
    classroom: { type: String, trim: true },
  },
  { _id: false }
);

const classRoutineSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    className: { type: String, required: true, trim: true }, // e.g. "Class 8"
    section: { type: String, required: true, trim: true }, // e.g. "A"

    // 'regular' = the standing weekly timetable for this class/section.
    // 'special' = a one-off schedule for a specific date (exam day, reduced
    // hours during Ramadan, a rearranged day after a holiday, etc.) that
    // overrides the regular routine just for that date.
    scheduleType: {
      type: String,
      enum: ['regular', 'special'],
      default: 'regular',
    },

    // Required for regular routines - which weekday this timetable applies to.
    // Bangladeshi schools run Saturday-Thursday, Friday being the weekly
    // holiday, so Friday is intentionally not an option here.
    dayOfWeek: {
      type: String,
      enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      required: function requiredForRegular() {
        return this.scheduleType === 'regular';
      },
    },

    // Required for special routines - the single calendar date it applies to.
    effectiveDate: {
      type: Date,
      required: function requiredForSpecial() {
        return this.scheduleType === 'special';
      },
    },

    // Optional short note shown alongside a special schedule, e.g. "Ramadan Routine"
    label: { type: String, trim: true },

    periods: {
      type: [periodSchema],
      validate: {
        validator: (periods) => Array.isArray(periods) && periods.length > 0,
        message: 'A routine needs at least one period',
      },
    },

    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Management and dashboard views always filter by school + class + section
classRoutineSchema.index({ school: 1, className: 1, section: 1 });

// Only one regular-schedule routine per class/section/weekday - publishing
// again for the same slot updates it in place instead of creating a duplicate
// (see upsert in createOrPublishRoutine).
classRoutineSchema.index(
  { school: 1, className: 1, section: 1, dayOfWeek: 1 },
  { unique: true, partialFilterExpression: { scheduleType: 'regular' } }
);

// Same idea for special routines, keyed on the specific date instead of weekday.
classRoutineSchema.index(
  { school: 1, className: 1, section: 1, effectiveDate: 1 },
  { unique: true, partialFilterExpression: { scheduleType: 'special' } }
);

module.exports = mongoose.model('ClassRoutine', classRoutineSchema);
