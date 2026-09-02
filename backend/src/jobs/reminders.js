const cron = require('node-cron');
const Exam = require('../models/Exam');
const FeePayment = require('../models/FeePayment');
const Student = require('../models/Student');
const { sendEmail } = require('../services/email.service');

// ---------------------------------------------------------------------
// Reminder window helpers
//
// Both reminders run once a day and look exactly N days ahead. Comparing
// on the calendar day (not a rolling 24h window) means the job gives the
// same result no matter what time of day it happens to run, and a missed
// run (e.g. server was down) doesn't cause a student to be reminded twice
// the next day - the window has already moved past their date.
// ---------------------------------------------------------------------

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysFromNow = (n) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + n);
  return d;
};

// ---------------------------------------------------------------------
// Exam reminders - one day before each exam routine slot's date
// ---------------------------------------------------------------------

const sendExamReminders = async () => {
  const targetDay = daysFromNow(1);
  const nextDay = daysFromNow(2);

  // Only published/ongoing exams - a draft exam's dates aren't finalized
  // and shouldn't reach students yet.
  const exams = await Exam.find({
    status: { $in: ['published', 'ongoing'] },
    'routines.examDate': { $gte: targetDay, $lt: nextDay },
  }).select('title school routines');

  for (const exam of exams) {
    const slotsTomorrow = exam.routines.filter(
      (slot) => slot.examDate >= targetDay && slot.examDate < nextDay
    );

    for (const slot of slotsTomorrow) {
      // Make-up exams can be restricted to specific students (targetStudentIds
      // holds Student.studentId strings); a regular slot reaches the whole
      // class/section (or every section, if the slot says 'All').
      const studentFilter = { schoolId: exam.school, currentClass: slot.className, status: 'active' };
      if (slot.section && slot.section !== 'All') studentFilter.section = slot.section;
      if (slot.isMakeUp && slot.targetStudentIds?.length) {
        studentFilter.studentId = { $in: slot.targetStudentIds };
      }

      const students = await Student.find(studentFilter).select('name guardianEmail studentId currentClass section');

      await Promise.all(
        students
          .filter((student) => student.guardianEmail)
          .map((student) =>
            sendEmail({
              to: student.guardianEmail,
              subject: `Reminder: ${slot.subject} exam tomorrow - ${student.currentClass}`,
              html: `<p>Hi,</p>` +
                `<p>This is a reminder that <strong>${student.name}</strong>'s ` +
                `<strong>${slot.subject}</strong> exam (${exam.title}) is scheduled for ` +
                `<strong>tomorrow, ${slot.examDate.toLocaleDateString()}</strong> ` +
                `from ${slot.startTime} to ${slot.endTime}` +
                `${slot.classroom ? ` in ${slot.classroom}` : ''}.</p>` +
                `<p>Please make sure they're prepared and arrive on time.</p>`,
              category: 'exam_reminder',
              school: exam.school,
              // One reminder per (exam routine slot, student), regardless of
              // how many times this job runs on that day.
              dedupeKey: `exam_reminder:${exam._id}:${slot._id}:${student._id}`,
            })
          )
      );
    }
  }
};

// ---------------------------------------------------------------------
// Fee reminders - three days before a pending fee's due date
// ---------------------------------------------------------------------

const sendFeeReminders = async () => {
  const targetDay = daysFromNow(3);
  const nextDay = daysFromNow(4);

  const duePayments = await FeePayment.find({
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $gte: targetDay, $lt: nextDay },
  }).select('schoolId studentId feeType amount dueDate');

  await Promise.all(
    duePayments.map(async (fee) => {
      const student = await Student.findById(fee.studentId).select('name guardianEmail guardianName currentClass section');
      if (!student || !student.guardianEmail) return;

      return sendEmail({
        to: student.guardianEmail,
        subject: `Reminder: ${fee.feeType} fee due in 3 days - ${student.name}`,
        html: `<p>Hi ${student.guardianName || ''},</p>` +
          `<p>This is a reminder that the <strong>${fee.feeType}</strong> fee of ` +
          `<strong>${fee.amount}</strong> for <strong>${student.name}</strong> ` +
          `(${student.currentClass}${student.section ? ` - ${student.section}` : ''}) ` +
          `is due on <strong>${fee.dueDate.toLocaleDateString()}</strong>.</p>` +
          `<p>Please make the payment before the due date to avoid any late fees.</p>`,
        category: 'fee_reminder',
        school: fee.schoolId,
        // One reminder per fee record, regardless of how many times this
        // job runs on that day.
        dedupeKey: `fee_reminder:${fee._id}`,
      });
    })
  );
};

const runDailyReminders = async () => {
  try {
    await sendExamReminders();
  } catch (error) {
    console.error('Exam reminder job failed:', error.message);
  }

  try {
    await sendFeeReminders();
  } catch (error) {
    console.error('Fee reminder job failed:', error.message);
  }
};

// Runs once a day at 08:00 server time - late enough that a same-day view
// of "due tomorrow" / "due in 3 days" is meaningful, early enough to give
// guardians a full day's notice.
const startReminderJobs = () => {
  cron.schedule('0 8 * * *', runDailyReminders);
};

module.exports = { startReminderJobs, runDailyReminders };
