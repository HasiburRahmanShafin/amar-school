const Notice = require('../models/Notice');
const School = require('../models/School');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

const EDITABLE_FIELDS = [
  'title',
  'description',
  'category',
  'startDate',
  'endDate',
  'attachmentUrl',
  'attachmentName',
];

// Keeps School.academicCalendar in sync with a notice. Notices are what
// admins publish; the calendar entry is just a reflection of that, kept
// in its own subdocument so SchoolWebsite / WebsiteBuilder don't need to
// know anything about notices at all.
const syncCalendarEntry = async (notice) => {
  const school = await School.findById(notice.school);
  if (!school) return;

  const entryData = {
    title: notice.title,
    date: notice.startDate,
    description: notice.description,
  };

  if (notice.calendarEventId) {
    const entry = school.academicCalendar.id(notice.calendarEventId);
    if (entry) {
      entry.set(entryData);
    } else {
      school.academicCalendar.push(entryData);
      notice.calendarEventId = school.academicCalendar[school.academicCalendar.length - 1]._id;
    }
  } else {
    school.academicCalendar.push(entryData);
    notice.calendarEventId = school.academicCalendar[school.academicCalendar.length - 1]._id;
  }

  await school.save();
};

const removeCalendarEntry = async (notice) => {
  if (!notice.calendarEventId) return;
  const school = await School.findById(notice.school);
  if (!school) return;
  school.academicCalendar.id(notice.calendarEventId)?.deleteOne();
  await school.save();
};

// Best-effort - notifies every teacher/student/parent in the school by
// email when a notice goes out. Same best-effort pattern used across the
// app (admission, fee, and result notifications) - failures are logged but
// never block the request (see email.service.js).
const notifySchoolMembers = async (notice) => {
  const members = await User.find({
    school: notice.school,
    role: { $in: ['teacher', 'student', 'parent'] },
    status: 'active',
  }).select('email name');

  const subjectPrefix = notice.category === 'emergency' ? '[Emergency] ' : '';
  await Promise.all(
    members.map((member) =>
      sendEmail({
        to: member.email,
        subject: `${subjectPrefix}${notice.title}`,
        html: `<p>Hi ${member.name},</p><p>${notice.description}</p>` +
          `<p><strong>Date:</strong> ${new Date(notice.startDate).toLocaleDateString()}` +
          (notice.endDate && notice.endDate !== notice.startDate
            ? ` - ${new Date(notice.endDate).toLocaleDateString()}`
            : '') +
          `</p>`,
        category: 'notice',
        school: notice.school,
      })
    )
  );
};

// @route POST /api/notices
// @access Protected - school_admin
const createNotice = async (req, res, next) => {
  try {
    const { title, description, category, startDate, endDate, attachmentUrl, attachmentName } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ message: 'title, description, startDate and endDate are required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'endDate cannot be before startDate' });
    }

    const notice = new Notice({
      school: req.schoolId,
      title,
      description,
      category: category || 'notice',
      startDate,
      endDate,
      attachmentUrl,
      attachmentName,
      publishedBy: req.user.id,
    });

    await syncCalendarEntry(notice);
    await notice.save();

    // Fire-and-forget so a slow mail provider doesn't hold up the response
    notifySchoolMembers(notice).catch((err) => console.error('Notice email batch failed:', err.message));

    res.status(201).json(notice);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/notices
// @access Protected - school_admin (management view of their own school's notices)
const getMyNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ school: req.schoolId }).sort({ startDate: -1 });
    res.json(notices);
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/notices/:id
// @access Protected - school_admin
const updateNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, school: req.schoolId });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    if (
      (req.body.startDate || req.body.endDate) &&
      new Date(req.body.endDate || notice.endDate) < new Date(req.body.startDate || notice.startDate)
    ) {
      return res.status(400).json({ message: 'endDate cannot be before startDate' });
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        notice[field] = req.body[field];
      }
    });

    await syncCalendarEntry(notice);
    await notice.save();

    res.json(notice);
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/notices/:id
// @access Protected - school_admin
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, school: req.schoolId });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });

    await removeCalendarEntry(notice);
    await notice.deleteOne();

    res.json({ message: 'Notice deleted' });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/notices/dashboard
// @access Protected - school_admin, teacher, student, parent (their own school)
// This is the feed each dashboard polls/fetches on load - the "push to
// dashboards" from the spec, without needing a websocket layer.
const getDashboardNotices = async (req, res, next) => {
  try {
    const notices = await Notice.find({ school: req.schoolId }).sort({ startDate: -1 }).limit(50);
    res.json(notices);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/notices/public/:subdomain
// @access Public - shown on the school website homepage
const getPublicNotices = async (req, res, next) => {
  try {
    const school = await School.findOne({
      subdomain: req.params.subdomain.toLowerCase(),
      status: 'active',
    }).select('_id');

    if (!school) {
      return res.status(404).json({ message: 'School not found or not yet approved' });
    }

    const notices = await Notice.find({ school: school._id })
      .sort({ startDate: -1 })
      .limit(10)
      .select('title description category startDate endDate attachmentUrl attachmentName');

    res.json(notices);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotice,
  getMyNotices,
  updateNotice,
  deleteNotice,
  getDashboardNotices,
  getPublicNotices,
};
