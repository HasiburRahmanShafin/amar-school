const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const User = require('../models/User');

// Helper to compute duration in minutes if start and end time are in "HH:mm" format
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;
  const totalStart = startH * 60 + startM;
  const totalEnd = endH * 60 + endM;
  if (totalEnd > totalStart) return totalEnd - totalStart;
  if (totalEnd < totalStart) return (24 * 60 - totalStart) + totalEnd;
  return null;
};

// Helper to sort routines by date and startTime
const sortRoutines = (routines) => {
  return [...routines].sort((a, b) => {
    const dateA = new Date(a.examDate).getTime();
    const dateB = new Date(b.examDate).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
};

// @route POST /api/exams
// @access Protected - school_admin
exports.createExam = async (req, res, next) => {
  try {
    const {
      title,
      academicTerm,
      academicYear,
      examType,
      startDate,
      endDate,
      description,
      status,
      isMakeUp,
      makeUpReason,
      routines = [],
    } = req.body;

    if (!title || !academicTerm || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, Academic Term, Start Date, and End Date are required' });
    }

    const processedRoutines = (routines || []).map((r) => ({
      ...r,
      durationMinutes: r.durationMinutes || calculateDuration(r.startTime, r.endTime),
    }));

    const isPublished = status === 'published';

    const exam = await Exam.create({
      school: req.schoolId,
      title,
      academicTerm,
      academicYear: academicYear || String(new Date().getFullYear()),
      examType: examType || (isMakeUp ? 'makeup_exam' : 'term_exam'),
      startDate,
      endDate,
      description,
      status: status || 'draft',
      isMakeUp: Boolean(isMakeUp),
      makeUpReason,
      publishedAt: isPublished ? new Date() : null,
      publishedBy: isPublished ? req.user.id : null,
      routines: sortRoutines(processedRoutines),
    });

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/exams
// @access Protected - school_admin, teacher
exports.getExams = async (req, res, next) => {
  try {
    const { academicTerm, academicYear, examType, status, isMakeUp, search, className } = req.query;
    const filter = { school: req.schoolId };

    if (academicTerm) filter.academicTerm = academicTerm;
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;
    if (status) filter.status = status;
    if (isMakeUp !== undefined) filter.isMakeUp = isMakeUp === 'true';
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { academicTerm: { $regex: search, $options: 'i' } },
        { 'routines.subject': { $regex: search, $options: 'i' } },
      ];
    }
    if (className) {
      filter['routines.className'] = className;
    }

    const exams = await Exam.find(filter)
      .sort({ startDate: -1, createdAt: -1 })
      .populate('publishedBy', 'name email');

    res.json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/exams/:id
// @access Protected - school_admin, teacher, student, parent
exports.getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId }).populate('publishedBy', 'name');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }
    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/exams/:id
// @access Protected - school_admin
exports.updateExam = async (req, res, next) => {
  try {
    const {
      title,
      academicTerm,
      academicYear,
      examType,
      startDate,
      endDate,
      description,
      status,
      isMakeUp,
      makeUpReason,
      routines,
    } = req.body;

    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    if (title !== undefined) exam.title = title;
    if (academicTerm !== undefined) exam.academicTerm = academicTerm;
    if (academicYear !== undefined) exam.academicYear = academicYear;
    if (examType !== undefined) exam.examType = examType;
    if (startDate !== undefined) exam.startDate = startDate;
    if (endDate !== undefined) exam.endDate = endDate;
    if (description !== undefined) exam.description = description;
    if (isMakeUp !== undefined) exam.isMakeUp = isMakeUp;
    if (makeUpReason !== undefined) exam.makeUpReason = makeUpReason;

    if (status !== undefined) {
      if (status === 'published' && exam.status !== 'published') {
        exam.publishedAt = new Date();
        exam.publishedBy = req.user.id;
      }
      exam.status = status;
    }

    if (routines !== undefined && Array.isArray(routines)) {
      const processed = routines.map((r) => ({
        ...r,
        durationMinutes: r.durationMinutes || calculateDuration(r.startTime, r.endTime),
      }));
      exam.routines = sortRoutines(processed);
    }

    await exam.save();
    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/exams/:id/publish
// @access Protected - school_admin
exports.togglePublishExam = async (req, res, next) => {
  try {
    const { status } = req.body;
    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    const nextStatus = status || (exam.status === 'published' ? 'draft' : 'published');
    exam.status = nextStatus;
    if (nextStatus === 'published') {
      exam.publishedAt = new Date();
      exam.publishedBy = req.user.id;
    }

    await exam.save();
    res.json({
      success: true,
      message: `Exam status changed to ${nextStatus}`,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/exams/:id
// @access Protected - school_admin
exports.deleteExam = async (req, res, next) => {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }
    await ExamResult.deleteMany({ school: schoolId, exam: req.params.id });
    res.json({ success: true, message: 'Exam schedule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/exams/:id/routines
// @access Protected - school_admin
exports.addRoutineSlot = async (req, res, next) => {
  try {
    const {
      className,
      section = 'All',
      subject,
      examDate,
      startTime,
      endTime,
      durationMinutes,
      classroom,
      invigilator,
      totalMarks,
      passMarks,
      instructions,
      isMakeUp,
      targetStudentIds,
      targetStudentNames,
      makeUpReason,
    } = req.body;

    if (!className || !subject || !examDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Class name, subject, exam date, start time and end time are required' });
    }

    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    const newSlot = {
      className,
      section,
      subject,
      examDate,
      startTime,
      endTime,
      durationMinutes: durationMinutes || calculateDuration(startTime, endTime),
      classroom,
      invigilator,
      totalMarks: totalMarks ?? 100,
      passMarks: passMarks ?? 33,
      instructions,
      isMakeUp: Boolean(isMakeUp),
      targetStudentIds: targetStudentIds || [],
      targetStudentNames: targetStudentNames || [],
      makeUpReason,
    };

    exam.routines.push(newSlot);
    exam.routines = sortRoutines(exam.routines);
    await exam.save();

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/exams/:id/routines/:slotId
// @access Protected - school_admin
exports.updateRoutineSlot = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    const slot = exam.routines.id(req.params.slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Routine slot not found' });
    }

    const allowed = [
      'className',
      'section',
      'subject',
      'examDate',
      'startTime',
      'endTime',
      'durationMinutes',
      'classroom',
      'invigilator',
      'totalMarks',
      'passMarks',
      'instructions',
      'isMakeUp',
      'targetStudentIds',
      'targetStudentNames',
      'makeUpReason',
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        slot[key] = req.body[key];
      }
    });

    if (slot.startTime && slot.endTime && !req.body.durationMinutes) {
      slot.durationMinutes = calculateDuration(slot.startTime, slot.endTime);
    }

    exam.routines = sortRoutines(exam.routines);
    await exam.save();

    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/exams/:id/routines/:slotId
// @access Protected - school_admin
exports.deleteRoutineSlot = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, school: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    exam.routines.pull(req.params.slotId);
    await exam.save();

    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/exams/makeup
// @access Protected - school_admin
// One-stop scheduler for make-up examinations
exports.scheduleMakeUpExam = async (req, res, next) => {
  try {
    const {
      parentExamId,
      title,
      academicTerm,
      academicYear,
      className,
      section = 'All',
      subject,
      examDate,
      startTime,
      endTime,
      classroom,
      invigilator,
      totalMarks,
      passMarks,
      instructions,
      targetStudentIds = [],
      targetStudentNames = [],
      makeUpReason,
    } = req.body;

    if (!title || !academicTerm || !className || !subject || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        message: 'Title, Academic Term, Class, Subject, Date, and Time are required for make-up exams',
      });
    }

    // If an existing parent exam was specified, add a make-up slot into it
    if (parentExamId) {
      const parentExam = await Exam.findOne({ _id: parentExamId, school: req.schoolId });
      if (parentExam) {
        parentExam.routines.push({
          className,
          section,
          subject,
          examDate,
          startTime,
          endTime,
          durationMinutes: calculateDuration(startTime, endTime),
          classroom,
          invigilator,
          totalMarks: totalMarks ?? 100,
          passMarks: passMarks ?? 33,
          instructions,
          isMakeUp: true,
          targetStudentIds,
          targetStudentNames,
          makeUpReason: makeUpReason || 'Make-up Examination',
        });
        parentExam.routines = sortRoutines(parentExam.routines);
        await parentExam.save();
        return res.status(201).json({ success: true, message: 'Make-up slot added to existing examination', data: parentExam });
      }
    }

    // Otherwise create a standalone make-up examination schedule
    const exam = await Exam.create({
      school: req.schoolId,
      title,
      academicTerm,
      academicYear: academicYear || String(new Date().getFullYear()),
      examType: 'makeup_exam',
      startDate: examDate,
      endDate: examDate,
      description: `Make-up examination: ${makeUpReason || 'Scheduled special/make-up session'}`,
      status: 'published',
      isMakeUp: true,
      makeUpReason,
      publishedAt: new Date(),
      publishedBy: req.user.id,
      routines: [
        {
          className,
          section,
          subject,
          examDate,
          startTime,
          endTime,
          durationMinutes: calculateDuration(startTime, endTime),
          classroom,
          invigilator,
          totalMarks: totalMarks ?? 100,
          passMarks: passMarks ?? 33,
          instructions,
          isMakeUp: true,
          targetStudentIds,
          targetStudentNames,
          makeUpReason,
        },
      ],
    });

    res.status(201).json({ success: true, message: 'Make-up examination created and published', data: exam });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/exams/student-routine
// @access Protected - student, school_admin, teacher, parent
// Personalized examination routine for enrolled class & section with instant updates
exports.getStudentExamRoutine = async (req, res, next) => {
  try {
    let { className, section, studentId, academicTerm } = req.query;

    // If a student or parent is logged in without query parameters, try looking up their Student record
    if ((!className || !studentId) && (req.user.role === 'student' || req.user.role === 'parent')) {
      const studentProfile = await Student.findOne({
        schoolId: req.schoolId || req.user.schoolId,
        $or: [
          { parentUserId: req.user.id },
          ...(req.user.id ? [{ userId: req.user.id }] : []),
          ...(req.user.email ? [{ guardianEmail: req.user.email }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      });

      if (studentProfile) {
        if (!className) className = studentProfile.currentClass;
        if (!section) section = studentProfile.section;
        if (!studentId) studentId = studentProfile.studentId;
      }
    }

    const filter = {
      school: req.schoolId,
      status: { $in: ['published', 'ongoing'] },
    };

    if (academicTerm) filter.academicTerm = academicTerm;

    const exams = await Exam.find(filter).sort({ startDate: 1 });

    // Filter routines belonging to student's class & section
    // Include make-up slots if they target all students in the class, or specifically target studentId
    const personalizedExams = [];

    exams.forEach((exam) => {
      const relevantRoutines = (exam.routines || []).filter((routine) => {
        // If className is provided, match class
        if (className && routine.className.toLowerCase() !== className.toLowerCase()) {
          return false;
        }

        // Match section: matches if routine is for 'All' or matches student's section
        if (section && routine.section && routine.section.toLowerCase() !== 'all' && routine.section.toLowerCase() !== section.toLowerCase()) {
          return false;
        }

        // If routine is a make-up slot with specific targeted student IDs, check if studentId is listed
        if (routine.isMakeUp && Array.isArray(routine.targetStudentIds) && routine.targetStudentIds.length > 0) {
          if (studentId && !routine.targetStudentIds.includes(studentId)) {
            return false;
          }
        }

        return true;
      });

      if (relevantRoutines.length > 0 || !className) {
        const examObj = exam.toObject();
        examObj.routines = relevantRoutines.length > 0 ? sortRoutines(relevantRoutines) : sortRoutines(exam.routines);
        personalizedExams.push(examObj);
      }
    });

    res.json({
      success: true,
      studentInfo: {
        className: className || 'All Classes',
        section: section || 'All Sections',
        studentId: studentId || null,
      },
      count: personalizedExams.length,
      data: personalizedExams,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/exams/meta
// @access Protected - school_admin, teacher, student
// Returns distinct academic terms, classes, years, and exam types for UI filters
exports.getExamMeta = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;

    const [terms, years, classesAgg] = await Promise.all([
      Exam.distinct('academicTerm', { school: schoolId }),
      Exam.distinct('academicYear', { school: schoolId }),
      Exam.aggregate([
        { $match: { school: schoolId } },
        { $unwind: '$routines' },
        {
          $group: {
            _id: { className: '$routines.className', section: '$routines.section' },
          },
        },
        { $sort: { '_id.className': 1, '_id.section': 1 } },
      ]),
    ]);

    // Also get active classes from enrolled students if any
    const studentClassesAgg = await Student.aggregate([
      { $match: { schoolId, status: 'active' } },
      {
        $group: {
          _id: { className: '$currentClass', section: '$section' },
        },
      },
      { $sort: { '_id.className': 1, '_id.section': 1 } },
    ]);

    const combinedClasses = new Map();
    [...classesAgg, ...studentClassesAgg].forEach((item) => {
      if (item._id && item._id.className) {
        const key = `${item._id.className}:::${item._id.section || 'All'}`;
        combinedClasses.set(key, { className: item._id.className, section: item._id.section || 'All' });
      }
    });

    res.json({
      success: true,
      academicTerms: terms.length > 0 ? terms : ['Term 1', 'Term 2', 'Final Term', 'Half Yearly', 'Annual Examination'],
      academicYears: years.length > 0 ? years : [String(new Date().getFullYear())],
      classes: Array.from(combinedClasses.values()),
      examTypes: [
        { value: 'term_exam', label: 'Term Examination' },
        { value: 'midterm', label: 'Midterm Examination' },
        { value: 'final_exam', label: 'Final Examination' },
        { value: 'class_test', label: 'Class Test' },
        { value: 'makeup_exam', label: 'Make-up / Special Exam' },
        { value: 'model_test', label: 'Model Test' },
        { value: 'practical', label: 'Practical / Lab Exam' },
        { value: 'other', label: 'Other' },
      ],
    });
  } catch (error) {
    next(error);
  }
};
