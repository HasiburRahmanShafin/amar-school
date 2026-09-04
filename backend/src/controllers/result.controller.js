const ExamResult = require('../models/ExamResult');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');
const {
  GRADING_SCALE,
  calculateSubjectGrade,
  calculateOverallResult,
  calculateClassRanks,
} = require('../utils/grading.utils');

// Helper to sanitize schoolId
const getSchoolId = (req) => {
  return req.schoolId || req.user?.schoolId;
};

// Best-effort - emails each student's guardian (falling back to the
// student's own login email if no guardian email is on file) that a
// mark sheet's results have just been published. Accepts one or more
// published ExamResult sheets (a single sheet from updateResultStatus,
// or several from publishAllExamResults) and notifies every student
// across all of them, one email per student. Failures are logged but
// never block the request (see email.service.js).
const notifyStudentsOfPublishedResults = async (sheets, schoolId) => {
  const sheetList = Array.isArray(sheets) ? sheets : [sheets];
  const studentIds = [
    ...new Set(sheetList.flatMap((sheet) => sheet.entries.map((e) => String(e.student)))),
  ];
  if (studentIds.length === 0) return;

  const students = await Student.find({ _id: { $in: studentIds } }).select(
    'name guardianEmail guardianName parentUserId currentClass section'
  );
  const studentsById = new Map(students.map((s) => [String(s._id), s]));

  // A student with a login account (parentUserId or a User with role
  // 'student') may not have guardianEmail set - fall back to that
  // account's email so the notification still goes somewhere useful.
  const parentUserIds = students.map((s) => s.parentUserId).filter(Boolean);
  const parentUsers = parentUserIds.length
    ? await User.find({ _id: { $in: parentUserIds } }).select('email')
    : [];
  const parentEmailById = new Map(parentUsers.map((u) => [String(u._id), u.email]));

  const emailsSent = new Set();
  await Promise.all(
    sheetList.flatMap((sheet) =>
      sheet.entries.map((entry) => {
        const student = studentsById.get(String(entry.student));
        if (!student) return null;
        const recipient = student.guardianEmail || (student.parentUserId && parentEmailById.get(String(student.parentUserId)));
        if (!recipient) return null;

        // Multiple subject sheets can be published together for the same
        // student - only email them once per publish action.
        const dedupeKey = `${recipient}:${sheet._id}`;
        if (emailsSent.has(dedupeKey)) return null;
        emailsSent.add(dedupeKey);

        return sendEmail({
          to: recipient,
          subject: `Exam result published - ${sheet.subject} (${student.currentClass}${student.section ? ` - ${student.section}` : ''})`,
          html: `<p>Hi ${student.guardianName || student.name},</p>` +
            `<p>The <strong>${sheet.subject}</strong> result for <strong>${student.name}</strong> has been published.</p>` +
            `<p>Log in to the dashboard to view the full mark sheet and grade.</p>`,
          category: 'result_published',
          school: schoolId,
        });
      })
    )
  );
};

// Class/section values are free-typed separately in Teacher Management
// (assignedClasses) and Student Management (currentClass/section), so a
// stray space or casing difference ("Class 6" saved for a teacher vs "class
// 6" for a student) would otherwise make Student.find() silently match zero
// students. Building a case-insensitive, trimmed exact-match regex avoids
// that without changing how the values are stored or displayed.
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCaseInsensitive = (value) => new RegExp(`^${escapeRegex(String(value).trim())}$`, 'i');

// @route GET /api/results/teacher/classes
// @access Protected - teacher, school_admin
exports.getTeacherClasses = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);

    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id, schoolId });
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher profile not found' });
      }

      return res.json({
        success: true,
        teacher: {
          id: teacher._id,
          name: teacher.name,
          teacherId: teacher.teacherId,
          department: teacher.department,
          subjects: teacher.subjects,
        },
        assignedClasses: teacher.assignedClasses || [],
      });
    }

    // For school_admin: return all distinct classes and subjects from Students & Routines
    const [classesAgg, distinctSubjects] = await Promise.all([
      Student.aggregate([
        { $match: { schoolId, status: 'active' } },
        { $group: { _id: { class: '$currentClass', section: '$section' } } },
        { $sort: { '_id.class': 1, '_id.section': 1 } },
      ]),
      Exam.distinct('routines.subject', { school: schoolId }),
    ]);

    const formattedClasses = classesAgg.map((item) => ({
      class: item._id.class,
      section: item._id.section || 'All',
      subject: '',
    }));

    res.json({
      success: true,
      teacher: null,
      assignedClasses: formattedClasses,
      availableSubjects: distinctSubjects,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/results/mark-sheet
// @access Protected - teacher, school_admin
exports.getMarkEntrySheet = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { examId, className, section = 'All', subject } = req.query;

    if (!examId || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Exam ID, Class Name, and Subject are required',
      });
    }

    // 1. Fetch Exam metadata & check slot details
    const exam = await Exam.findOne({ _id: examId, school: schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found' });
    }

    // Find matching routine slot to extract default totalMarks and passMarks
    const matchedSlot = (exam.routines || []).find((r) => {
      const classMatch = r.className?.toLowerCase() === className?.toLowerCase();
      const subjectMatch = r.subject?.toLowerCase() === subject?.toLowerCase();
      return classMatch && subjectMatch;
    });

    const maxMarks = matchedSlot?.totalMarks || 100;
    const passMarks = matchedSlot?.passMarks || 33;

    // 2. Fetch all active enrolled students in this class and section
        const studentFilter = {
      schoolId,
      currentClass: exactCaseInsensitive(className),
      status: 'active',
    };
    if (section && section !== 'All') {
      studentFilter.section = exactCaseInsensitive(section);
    }

    const students = await Student.find(studentFilter).sort({ rollNumber: 1, name: 1 });

    // 3. Find existing saved mark sheet
    const resultSheet = await ExamResult.findOne({
      school: schoolId,
      exam: examId,
      className,
      section: section || 'All',
      subject,
    }).populate('submittedBy', 'name email').populate('reviewedBy', 'name email');

    // 4. Merge enrolled students with any saved marks
    const existingEntriesMap = new Map();
    if (resultSheet && Array.isArray(resultSheet.entries)) {
      resultSheet.entries.forEach((e) => {
        existingEntriesMap.set(e.studentId || e.student?.toString(), e);
      });
    }

    const populatedEntries = students.map((student) => {
      const existing = existingEntriesMap.get(student.studentId) || existingEntriesMap.get(student._id.toString());
      if (existing) {
        return {
          student: student._id,
          studentId: student.studentId,
          studentName: student.name,
          rollNumber: student.rollNumber || '',
          gender: student.gender,
          photoUrl: student.photoUrl,
          theoryMarks: existing.theoryMarks ?? existing.marksObtained ?? 0,
          practicalMarks: existing.practicalMarks ?? 0,
          marksObtained: existing.marksObtained ?? 0,
          percentage: existing.percentage ?? 0,
          gradePoint: existing.gradePoint ?? 0.0,
          letterGrade: existing.letterGrade ?? 'F',
          attendancePercentage: existing.attendancePercentage ?? 100,
          teacherComments: existing.teacherComments || '',
          isAbsent: Boolean(existing.isAbsent),
        };
      }

      // Default blank entry for student
      return {
        student: student._id,
        studentId: student.studentId,
        studentName: student.name,
        rollNumber: student.rollNumber || '',
        gender: student.gender,
        photoUrl: student.photoUrl,
        theoryMarks: 0,
        practicalMarks: 0,
        marksObtained: 0,
        percentage: 0,
        gradePoint: 0.0,
        letterGrade: 'F',
        attendancePercentage: 100,
        teacherComments: '',
        isAbsent: false,
      };
    });

    res.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        academicTerm: exam.academicTerm,
        academicYear: exam.academicYear,
        examType: exam.examType,
        status: exam.status,
      },
      sheet: {
        id: resultSheet?._id || null,
        className,
        section: section || 'All',
        subject,
        maxMarks: resultSheet?.maxMarks || maxMarks,
        passMarks: resultSheet?.passMarks || passMarks,
        theoryMaxMarks: resultSheet?.theoryMaxMarks || maxMarks,
        practicalMaxMarks: resultSheet?.practicalMaxMarks || 0,
        status: resultSheet?.status || 'draft',
        teacherName: resultSheet?.teacherName || req.user.name,
        submittedAt: resultSheet?.submittedAt || null,
        submittedBy: resultSheet?.submittedBy || null,
        reviewedAt: resultSheet?.reviewedAt || null,
        reviewedBy: resultSheet?.reviewedBy || null,
        publishedAt: resultSheet?.publishedAt || null,
        adminFeedback: resultSheet?.adminFeedback || '',
        entries: populatedEntries,
      },
      gradingScale: GRADING_SCALE,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/results/mark-sheet
// @access Protected - teacher, school_admin
exports.saveMarkEntrySheet = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const {
      examId,
      className,
      section = 'All',
      subject,
      maxMarks = 100,
      passMarks = 33,
      theoryMaxMarks = 100,
      practicalMaxMarks = 0,
      entries = [],
      action = 'save_draft', // 'save_draft' | 'submit_review'
      adminFeedback,
    } = req.body;

    if (!examId || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Exam ID, Class Name, and Subject are required',
      });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Teacher record reference if logged in as teacher
    let teacherDoc = null;
    if (req.user.role === 'teacher') {
      teacherDoc = await Teacher.findOne({ userId: req.user.id, schoolId });
    }

    const validMaxMarks = Number(maxMarks) > 0 ? Number(maxMarks) : 100;
    const validPassMarks = Number(passMarks) >= 0 ? Number(passMarks) : 33;

    // Process & calculate grades for each student entry
    const processedEntries = entries.map((item) => {
      const isAbsent = Boolean(item.isAbsent);
      const theory = isAbsent ? 0 : Math.max(0, Number(item.theoryMarks || 0));
      const practical = isAbsent ? 0 : Math.max(0, Number(item.practicalMarks || 0));
      const totalObtained = isAbsent ? 0 : Math.min(theory + practical, validMaxMarks);

      const gradeInfo = calculateSubjectGrade(totalObtained, validMaxMarks, isAbsent);

      return {
        student: item.student,
        studentId: item.studentId,
        studentName: item.studentName,
        rollNumber: item.rollNumber || '',
        theoryMarks: theory,
        practicalMarks: practical,
        marksObtained: totalObtained,
        percentage: gradeInfo.percentage,
        gradePoint: gradeInfo.gradePoint,
        letterGrade: gradeInfo.letterGrade,
        attendancePercentage: Math.min(100, Math.max(0, Number(item.attendancePercentage ?? 100))),
        teacherComments: item.teacherComments || '',
        isAbsent,
      };
    });

    const isSubmitting = action === 'submit_review';
    const isPublishing = action === 'publish' && req.user.role === 'school_admin';

    let nextStatus = 'draft';
    if (isPublishing) nextStatus = 'published';
    else if (isSubmitting) nextStatus = 'submitted';

    const sheetData = {
      school: schoolId,
      exam: examId,
      academicTerm: exam.academicTerm,
      academicYear: exam.academicYear,
      className,
      section: section || 'All',
      subject,
      teacher: teacherDoc ? teacherDoc._id : undefined,
      teacherName: teacherDoc ? teacherDoc.name : req.user.name,
      maxMarks: validMaxMarks,
      passMarks: validPassMarks,
      theoryMaxMarks: Number(theoryMaxMarks) || validMaxMarks,
      practicalMaxMarks: Number(practicalMaxMarks) || 0,
      entries: processedEntries,
      status: nextStatus,
    };

    if (isSubmitting) {
      sheetData.submittedAt = new Date();
      sheetData.submittedBy = req.user.id;
    }
    if (isPublishing) {
      sheetData.publishedAt = new Date();
      sheetData.reviewedAt = new Date();
      sheetData.reviewedBy = req.user.id;
    }
    if (adminFeedback !== undefined) {
      sheetData.adminFeedback = adminFeedback;
    }

    const updatedSheet = await ExamResult.findOneAndUpdate(
      {
        school: schoolId,
        exam: examId,
        className,
        section: section || 'All',
        subject,
      },
      { $set: sheetData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (isPublishing) {
      await notifyStudentsOfPublishedResults(updatedSheet, schoolId);
    }

    res.json({
      success: true,
      message: isPublishing
        ? 'Marks published successfully'
        : isSubmitting
        ? 'Marks submitted for administrative review'
        : 'Mark sheet saved as draft',
      data: updatedSheet,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/results/admin/overview
// @access Protected - school_admin
exports.getAdminResultOverview = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { examId, className, status } = req.query;

    const filter = { school: schoolId };
    if (examId) filter.exam = examId;
    if (className) filter.className = className;
    if (status && status !== 'ALL') filter.status = status;

    const [sheets, exams, classesAgg] = await Promise.all([
      ExamResult.find(filter)
        .populate('exam', 'title academicTerm academicYear status startDate endDate')
        .populate('submittedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ updatedAt: -1 }),
      Exam.find({ school: schoolId }).sort({ startDate: -1 }),
      Student.aggregate([
        { $match: { schoolId, status: 'active' } },
        { $group: { _id: { className: '$currentClass', section: '$section' }, studentCount: { $sum: 1 } } },
        { $sort: { '_id.className': 1, '_id.section': 1 } },
      ]),
    ]);

    // Statistics computation
    const totalSheets = sheets.length;
    const submittedCount = sheets.filter((s) => s.status === 'submitted').length;
    const approvedCount = sheets.filter((s) => s.status === 'approved').length;
    const publishedCount = sheets.filter((s) => s.status === 'published').length;
    const draftCount = sheets.filter((s) => s.status === 'draft').length;

    // Enhance sheets with calculated stats (average marks, pass rate, highest marks)
    const enhancedSheets = sheets.map((sheet) => {
      const entries = sheet.entries || [];
      const totalStudents = entries.length;
      let totalMarks = 0;
      let passedStudents = 0;
      let highestMark = 0;

      entries.forEach((e) => {
        const marks = Number(e.marksObtained || 0);
        totalMarks += marks;
        if (marks > highestMark) highestMark = marks;
        if (!e.isAbsent && e.gradePoint > 0) passedStudents++;
      });

      const averageMark = totalStudents > 0 ? Number((totalMarks / totalStudents).toFixed(1)) : 0;
      const passRate = totalStudents > 0 ? Number(((passedStudents / totalStudents) * 100).toFixed(1)) : 0;

      return {
        ...sheet.toObject(),
        stats: {
          totalStudents,
          passedStudents,
          failedStudents: totalStudents - passedStudents,
          averageMark,
          passRate,
          highestMark,
        },
      };
    });

    res.json({
      success: true,
      stats: {
        totalSheets,
        submittedCount,
        approvedCount,
        publishedCount,
        draftCount,
      },
      sheets: enhancedSheets,
      exams,
      classes: classesAgg.map((c) => ({
        className: c._id.className,
        section: c._id.section || 'All',
        studentCount: c.studentCount,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/results/:id/status
// @access Protected - school_admin
exports.updateResultStatus = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { status, adminFeedback } = req.body;

    if (!['draft', 'submitted', 'under_review', 'approved', 'published'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const sheet = await ExamResult.findOne({ _id: req.params.id, school: schoolId });
    if (!sheet) {
      return res.status(404).json({ success: false, message: 'Mark sheet not found' });
    }

    sheet.status = status;
    if (adminFeedback !== undefined) sheet.adminFeedback = adminFeedback;
    sheet.reviewedAt = new Date();
    sheet.reviewedBy = req.user.id;

    if (status === 'published') {
      sheet.publishedAt = new Date();
    }

    await sheet.save();

    if (status === 'published') {
      await notifyStudentsOfPublishedResults(sheet, schoolId);
    }

    res.json({
      success: true,
      message: `Mark sheet status updated to ${status}`,
      data: sheet,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/results/publish-all
// @access Protected - school_admin
exports.publishAllExamResults = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { examId, className, section } = req.body;

    if (!examId) {
      return res.status(400).json({ success: false, message: 'Exam ID is required' });
    }

    const filter = {
      school: schoolId,
      exam: examId,
      status: { $in: ['submitted', 'approved', 'draft'] },
    };
    if (className) filter.className = className;
    if (section && section !== 'All') filter.section = section;

    // Captured before the bulk update so we know exactly which sheets (and
    // therefore which students) were just published, for notification.
    const sheetsToPublish = await ExamResult.find(filter).select('subject className section entries');

    const result = await ExamResult.updateMany(filter, {
      $set: {
        status: 'published',
        publishedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    await notifyStudentsOfPublishedResults(sheetsToPublish, schoolId);

    res.json({
      success: true,
      message: `Successfully published ${result.modifiedCount} mark sheet(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/results/student
// @access Protected - student, parent, school_admin, teacher
exports.getStudentResults = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    let { studentId, rollNumber, className, examId, academicTerm } = req.query;

    // If logged in as student or parent, resolve student record
    if (req.user.role === 'student' || req.user.role === 'parent') {
      const studentProfile = await Student.findOne({
        schoolId,
        $or: [
          { parentUserId: req.user.id },
          ...(req.user.id ? [{ userId: req.user.id }] : []),
          ...(req.user.email ? [{ guardianEmail: req.user.email }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      });

      if (studentProfile) {
        studentId = studentProfile.studentId;
        className = studentProfile.currentClass;
        rollNumber = studentProfile.rollNumber;
      }
    }

    // 1. Fetch all published result sheets for the school
    const filter = {
      school: schoolId,
      status: 'published',
    };
    if (examId) filter.exam = examId;
    if (academicTerm && academicTerm !== 'ALL') filter.academicTerm = academicTerm;
    if (className) filter.className = className;

    const publishedSheets = await ExamResult.find(filter)
      .populate('exam', 'title academicTerm academicYear examType startDate endDate')
      .sort({ createdAt: -1 });

    // 2. Group published sheets by Exam and Class/Section to calculate peer ranking
    const examClassMap = new Map(); // key: `${examId}:::${className}:::${section}`

    publishedSheets.forEach((sheet) => {
      const examKey = `${sheet.exam?._id || sheet.exam}:::${sheet.className}:::${sheet.section || 'All'}`;
      if (!examClassMap.has(examKey)) {
        examClassMap.set(examKey, {
          exam: sheet.exam,
          className: sheet.className,
          section: sheet.section,
          academicTerm: sheet.academicTerm,
          academicYear: sheet.academicYear,
          subjects: [],
        });
      }
      examClassMap.get(examKey).subjects.push(sheet);
    });

    // 3. For each exam group, calculate student summaries and class ranks
    const studentExamResults = [];

    for (const [key, group] of examClassMap.entries()) {
      // Find all distinct students in this exam group
      const studentMap = new Map(); // studentId -> { info, subjects: [] }

      group.subjects.forEach((subjectSheet) => {
        (subjectSheet.entries || []).forEach((entry) => {
          if (!studentMap.has(entry.studentId)) {
            studentMap.set(entry.studentId, {
              studentId: entry.studentId,
              studentName: entry.studentName,
              rollNumber: entry.rollNumber,
              subjectEntries: [],
            });
          }

          studentMap.get(entry.studentId).subjectEntries.push({
            subject: subjectSheet.subject,
            maxMarks: subjectSheet.maxMarks,
            passMarks: subjectSheet.passMarks,
            theoryMarks: entry.theoryMarks,
            practicalMarks: entry.practicalMarks,
            marksObtained: entry.marksObtained,
            percentage: entry.percentage,
            gradePoint: entry.gradePoint,
            letterGrade: entry.letterGrade,
            attendancePercentage: entry.attendancePercentage,
            teacherComments: entry.teacherComments,
            isAbsent: entry.isAbsent,
            teacherName: subjectSheet.teacherName,
          });
        });
      });

      // Calculate overall result for each student in the group
      const studentSummaries = Array.from(studentMap.values()).map((s) => {
        const overall = calculateOverallResult(s.subjectEntries);
        // Calculate average attendance across subjects
        const totalAtt = s.subjectEntries.reduce((sum, item) => sum + (item.attendancePercentage || 100), 0);
        const avgAttendance = s.subjectEntries.length > 0 ? Number((totalAtt / s.subjectEntries.length).toFixed(1)) : 100;

        return {
          ...s,
          ...overall,
          averageAttendance: avgAttendance,
        };
      });

      // Calculate class ranks
      const rankedStudents = calculateClassRanks(studentSummaries);

      // If specific studentId is requested, find that student; otherwise return all or match
      rankedStudents.forEach((studentSummary) => {
        if (!studentId || studentSummary.studentId === studentId) {
          studentExamResults.push({
            exam: group.exam,
            className: group.className,
            section: group.section,
            academicTerm: group.academicTerm,
            academicYear: group.academicYear,
            studentInfo: {
              studentId: studentSummary.studentId,
              studentName: studentSummary.studentName,
              rollNumber: studentSummary.rollNumber,
              className: group.className,
              section: group.section,
            },
            summary: {
              totalMarksObtained: studentSummary.totalMarksObtained,
              totalMaxMarks: studentSummary.totalMaxMarks,
              percentage: studentSummary.percentage,
              overallGPA: studentSummary.overallGPA,
              overallGrade: studentSummary.overallGrade,
              classRank: studentSummary.classRank,
              totalStudentsInClass: rankedStudents.length,
              averageAttendance: studentSummary.averageAttendance,
              passedSubjectsCount: studentSummary.passedSubjectsCount,
              totalSubjectsCount: studentSummary.totalSubjectsCount,
              hasFailedSubject: studentSummary.hasFailedSubject,
              remarks: studentSummary.remarks,
            },
            subjects: studentSummary.subjectEntries,
          });
        }
      });
    }

    res.json({
      success: true,
      count: studentExamResults.length,
      studentId: studentId || null,
      data: studentExamResults,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/results/report-card
// @access Protected - student, parent, school_admin, teacher
exports.getReportCardData = async (req, res, next) => {
  try {
    const schoolId = getSchoolId(req);
    const { examId, studentId } = req.query;

    if (!examId || !studentId) {
      return res.status(400).json({ success: false, message: 'Exam ID and Student ID are required' });
    }

    const [school, exam, student, publishedSheets] = await Promise.all([
      School.findById(schoolId),
      Exam.findOne({ _id: examId, school: schoolId }),
      Student.findOne({ schoolId, studentId }),
      ExamResult.find({ school: schoolId, exam: examId, status: 'published' }),
    ]);

    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Find all sheets for the student's class and section
    const classSheets = publishedSheets.filter((s) => {
      const classMatch = s.className?.toLowerCase() === student.currentClass?.toLowerCase();
      const sectionMatch = s.section === 'All' || !student.section || s.section?.toLowerCase() === student.section?.toLowerCase();
      return classMatch && sectionMatch;
    });

    if (classSheets.length === 0) {
      return res.status(404).json({ success: false, message: 'No published results available for this class in this exam' });
    }

    // Build subject list and compute highest mark per subject
    const subjectBreakdown = [];
    const classStudentSummaries = new Map(); // studentId -> { studentId, subjectEntries: [] }

    classSheets.forEach((sheet) => {
      let highestInSubject = 0;

      (sheet.entries || []).forEach((entry) => {
        const marks = Number(entry.marksObtained || 0);
        if (marks > highestInSubject) highestInSubject = marks;

        if (!classStudentSummaries.has(entry.studentId)) {
          classStudentSummaries.set(entry.studentId, {
            studentId: entry.studentId,
            studentName: entry.studentName,
            rollNumber: entry.rollNumber,
            subjectEntries: [],
          });
        }
        classStudentSummaries.get(entry.studentId).subjectEntries.push({
          marksObtained: entry.marksObtained,
          maxMarks: sheet.maxMarks,
          gradePoint: entry.gradePoint,
          isAbsent: entry.isAbsent,
        });
      });

      // Target student's entry
      const studentEntry = (sheet.entries || []).find((e) => e.studentId === studentId);
      if (studentEntry) {
        subjectBreakdown.push({
          subject: sheet.subject,
          maxMarks: sheet.maxMarks,
          passMarks: sheet.passMarks,
          theoryMaxMarks: sheet.theoryMaxMarks,
          practicalMaxMarks: sheet.practicalMaxMarks,
          theoryMarks: studentEntry.theoryMarks,
          practicalMarks: studentEntry.practicalMarks,
          marksObtained: studentEntry.marksObtained,
          highestMarkInClass: highestInSubject,
          percentage: studentEntry.percentage,
          gradePoint: studentEntry.gradePoint,
          letterGrade: studentEntry.letterGrade,
          attendancePercentage: studentEntry.attendancePercentage,
          teacherComments: studentEntry.teacherComments,
          isAbsent: studentEntry.isAbsent,
        });
      }
    });

    // Compute peer class ranks
    const summaries = Array.from(classStudentSummaries.values()).map((s) => {
      const overall = calculateOverallResult(s.subjectEntries);
      return {
        ...s,
        ...overall,
      };
    });

    const ranked = calculateClassRanks(summaries);
    const myRankItem = ranked.find((r) => r.studentId === studentId);

    const overallResult = calculateOverallResult(subjectBreakdown);
    const totalAtt = subjectBreakdown.reduce((sum, s) => sum + (s.attendancePercentage || 100), 0);
    const averageAttendance = subjectBreakdown.length > 0 ? Number((totalAtt / subjectBreakdown.length).toFixed(1)) : 100;

    res.json({
      success: true,
      reportCard: {
        school: {
          name: school?.name || 'Amar School',
          eiin: school?.eiin || '',
          address: school?.address || '',
          phone: school?.phone || '',
          email: school?.email || '',
        },
        exam: {
          id: exam._id,
          title: exam.title,
          academicTerm: exam.academicTerm,
          academicYear: exam.academicYear,
          examType: exam.examType,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        student: {
          name: student.name,
          studentId: student.studentId,
          rollNumber: student.rollNumber || 'N/A',
          currentClass: student.currentClass,
          section: student.section,
          gender: student.gender,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          dateOfBirth: student.dateOfBirth,
        },
        summary: {
          totalMarksObtained: overallResult.totalMarksObtained,
          totalMaxMarks: overallResult.totalMaxMarks,
          percentage: overallResult.percentage,
          overallGPA: overallResult.overallGPA,
          overallGrade: overallResult.overallGrade,
          classRank: myRankItem?.classRank ?? null,
          totalStudentsInClass: ranked.length,
          averageAttendance,
          passedSubjectsCount: overallResult.passedSubjectsCount,
          totalSubjectsCount: overallResult.totalSubjectsCount,
          hasFailedSubject: overallResult.hasFailedSubject,
          remarks: overallResult.remarks,
          publishedDate: new Date(),
        },
        subjects: subjectBreakdown,
        gradingScale: GRADING_SCALE,
      },
    });
  } catch (error) {
    next(error);
  }
};
