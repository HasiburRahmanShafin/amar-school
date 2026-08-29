const ClassRoutine = require('../models/ClassRoutine');
const School = require('../models/School');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

const DAY_LABELS = {
  saturday: 'Saturday',
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
};

const sortPeriods = (periods) =>
  [...periods].sort((a, b) => a.periodNumber - b.periodNumber);

const validatePeriods = (periods) => {
  if (!Array.isArray(periods) || periods.length === 0) {
    return 'At least one period is required';
  }
  for (const period of periods) {
    if (!period.subject || !period.teacherName || !period.startTime || !period.endTime) {
      return 'Each period needs a subject, teacher, start time and end time';
    }
    if (period.endTime <= period.startTime) {
      return `Period ${period.periodNumber || ''}: end time must be after start time`.trim();
    }
  }
  return null;
};

// Best-effort notification to everyone in the school who'd care about a
// class schedule change. There's no per-student class assignment yet (see
// User model), so - same simplification the notice module makes - this
// reaches every teacher/student/parent in the school rather than only the
// affected class/section. Failures are logged but never block the request.
const notifyRoutineChange = async (routine, { isNew }) => {
  const members = await User.find({
    school: routine.school,
    role: { $in: ['teacher', 'student', 'parent'] },
    status: 'active',
  }).select('email name');

  const when =
    routine.scheduleType === 'special'
      ? new Date(routine.effectiveDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : `every ${DAY_LABELS[routine.dayOfWeek]}`;

  const subject = `${isNew ? 'New' : 'Updated'} Routine: ${routine.className} - Section ${routine.section}`;
  const html =
    `<p>The class routine for <strong>${routine.className} (Section ${routine.section})</strong> ` +
    `has been ${isNew ? 'published' : 'updated'} for <strong>${when}</strong>.</p>` +
    `<p>Please check your dashboard for the full schedule.</p>`;

  await Promise.all(members.map((member) => sendEmail({ to: member.email, subject, html })));
};

// @route POST /api/routines
// @access Protected - school_admin, teacher
// Creates a routine, or if one already exists for the same class/section/day
// (regular) or class/section/date (special), republishes it in place -
// mirrors how Notice edits work, just keyed by class/section/day instead of id.
const createOrPublishRoutine = async (req, res, next) => {
  try {
    const { className, section, scheduleType, dayOfWeek, effectiveDate, label, periods } = req.body;

    if (!className || !section || !periods) {
      return res.status(400).json({ message: 'className, section and periods are required' });
    }

    const type = scheduleType === 'special' ? 'special' : 'regular';
    if (type === 'regular' && !dayOfWeek) {
      return res.status(400).json({ message: 'dayOfWeek is required for a regular routine' });
    }
    if (type === 'special' && !effectiveDate) {
      return res.status(400).json({ message: 'effectiveDate is required for a special routine' });
    }

    const periodError = validatePeriods(periods);
    if (periodError) {
      return res.status(400).json({ message: periodError });
    }

    const filter = {
      school: req.schoolId,
      className,
      section,
      scheduleType: type,
      ...(type === 'regular' ? { dayOfWeek } : { effectiveDate }),
    };

    const existing = await ClassRoutine.findOne(filter);

    const routine = await ClassRoutine.findOneAndUpdate(
      filter,
      {
        $set: {
          label,
          periods: sortPeriods(periods),
          publishedBy: req.user.id,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    notifyRoutineChange(routine, { isNew: !existing }).catch((err) =>
      console.error('Routine notification batch failed:', err.message)
    );

    res.status(existing ? 200 : 201).json(routine);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A routine for this class, section and day/date already exists' });
    }
    next(error);
  }
};

// @route GET /api/routines
// @access Protected - school_admin, teacher (management view of their own school's routines)
const getMyRoutines = async (req, res, next) => {
  try {
    const { className, section } = req.query;
    const filter = { school: req.schoolId };
    if (className) filter.className = className;
    if (section) filter.section = section;

    const routines = await ClassRoutine.find(filter).sort({
      className: 1,
      section: 1,
      scheduleType: 1,
      dayOfWeek: 1,
      effectiveDate: 1,
    });
    res.json(routines);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/routines/classes
// @access Protected - school_admin, teacher
// Convenience list of class/section pairs that already have a routine, so
// the management form can offer them instead of the admin retyping.
const getRoutineClasses = async (req, res, next) => {
  try {
    const pairs = await ClassRoutine.aggregate([
      { $match: { school: req.schoolId } },
      { $group: { _id: { className: '$className', section: '$section' } } },
      { $project: { _id: 0, className: '$_id.className', section: '$_id.section' } },
      { $sort: { className: 1, section: 1 } },
    ]);
    res.json(pairs);
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/routines/:id
// @access Protected - school_admin, teacher
const updateRoutine = async (req, res, next) => {
  try {
    const routine = await ClassRoutine.findOne({ _id: req.params.id, school: req.schoolId });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    const { label, periods } = req.body;

    if (periods) {
      const periodError = validatePeriods(periods);
      if (periodError) return res.status(400).json({ message: periodError });
      routine.periods = sortPeriods(periods);
    }
    if (label !== undefined) routine.label = label;
    routine.publishedBy = req.user.id;

    await routine.save();

    notifyRoutineChange(routine, { isNew: false }).catch((err) =>
      console.error('Routine notification batch failed:', err.message)
    );

    res.json(routine);
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/routines/:id
// @access Protected - school_admin, teacher
const deleteRoutine = async (req, res, next) => {
  try {
    const routine = await ClassRoutine.findOne({ _id: req.params.id, school: req.schoolId });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    await routine.deleteOne();
    res.json({ message: 'Routine deleted' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/routines/dashboard
// @access Protected - school_admin, teacher, student, parent (their own school)
// The feed each dashboard reads on load, same "push via poll" approach as
// /api/notices/dashboard. className/section are optional query filters -
// once student/parent accounts carry their own class assignment, the
// dashboard can pass those in automatically instead of the user picking.
const getDashboardRoutine = async (req, res, next) => {
  try {
    const { className, section } = req.query;
    const filter = { school: req.schoolId };
    if (className) filter.className = className;
    if (section) filter.section = section;

    const routines = await ClassRoutine.find(filter).sort({
      scheduleType: 1,
      dayOfWeek: 1,
      effectiveDate: 1,
    });
    res.json(routines);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/routines/public/:subdomain
// @access Public - shown on the school website
// Without className/section query params, only returns the list of classes
// that have a published routine, so the site can offer a picker. With them,
// returns that class/section's regular week plus any upcoming special day.
const getPublicRoutine = async (req, res, next) => {
  try {
    const school = await School.findOne({
      subdomain: req.params.subdomain.toLowerCase(),
      status: 'active',
    }).select('_id');

    if (!school) {
      return res.status(404).json({ message: 'School not found or not yet approved' });
    }

    const { className, section } = req.query;

    if (!className || !section) {
      const pairs = await ClassRoutine.aggregate([
        { $match: { school: school._id } },
        { $group: { _id: { className: '$className', section: '$section' } } },
        { $project: { _id: 0, className: '$_id.className', section: '$_id.section' } },
        { $sort: { className: 1, section: 1 } },
      ]);
      return res.json({ classes: pairs, routines: [] });
    }

    const routines = await ClassRoutine.find({ school: school._id, className, section })
      .sort({ scheduleType: 1, dayOfWeek: 1, effectiveDate: 1 })
      .select('className section scheduleType dayOfWeek effectiveDate label periods');

    res.json({ classes: [], routines });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrPublishRoutine,
  getMyRoutines,
  getRoutineClasses,
  updateRoutine,
  deleteRoutine,
  getDashboardRoutine,
  getPublicRoutine,
};
