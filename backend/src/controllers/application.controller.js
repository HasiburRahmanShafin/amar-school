const Applicant = require('../models/Applicant');
const AdmissionCircular = require('../models/AdmissionCircular');
const User = require('../models/User');
const { sendEmail } = require('../services/email.service');

// Best-effort - notifies every active school_admin for the circular's
// school that a new application came in. Failures are logged but never
// block the response (see email.service.js).
const notifyAdminsOfNewApplication = async (applicant, circular) => {
  const admins = await User.find({
    school: applicant.schoolId,
    role: 'school_admin',
    status: 'active',
  }).select('email name');

  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `New application: ${applicant.studentName} - ${circular.title}`,
        html: `<p>Hi ${admin.name},</p>` +
          `<p>A new application has been submitted for <strong>${circular.title}</strong> (${circular.classOrGrade}).</p>` +
          `<p><strong>Applicant:</strong> ${applicant.studentName}<br/>` +
          `<strong>Guardian:</strong> ${applicant.guardianName} (${applicant.guardianPhone})</p>` +
          `<p>Please review it from your admissions dashboard.</p>`,
        category: 'admission_new_application_admin_alert',
        school: applicant.schoolId,
      })
    )
  );
};

exports.submitApplication = async (req, res) => {
  try {
    const { circularId, studentName, dateOfBirth, gender, guardianName, guardianPhone, guardianEmail, address, previousSchool, documents } = req.body;
    const circular = await AdmissionCircular.findById(circularId);
    if (!circular || circular.status !== 'published') {
      return res.status(400).json({ success: false, message: 'Admission circular not open' });
    }
    if (new Date() > new Date(circular.applicationDeadline)) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed' });
    }
    const applicant = await Applicant.create({
      circularId, schoolId: circular.schoolId, studentName, dateOfBirth, gender,
      guardianName, guardianPhone, guardianEmail, address, previousSchool, documents,
    });

    // Confirmation to the guardian + heads-up to the school's admins.
    // Best-effort: neither failure should affect the 201 response below.
    await sendEmail({
      to: applicant.guardianEmail,
      subject: `Application received - ${circular.title}`,
      html: `<p>Hi ${applicant.guardianName},</p>` +
        `<p>We've received your application for <strong>${applicant.studentName}</strong> ` +
        `to <strong>${circular.title}</strong> (${circular.classOrGrade}).</p>` +
        `<p>You'll be notified by email once a decision has been made. You can also check the status any time from the admissions portal.</p>`,
      category: 'admission_confirmation',
      school: applicant.schoolId,
    });
    await notifyAdminsOfNewApplication(applicant, circular);

    res.status(201).json({ success: true, data: applicant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const filter = { schoolId: req.user.schoolId };
    if (req.query.circularId) filter.circularId = req.query.circularId;
    if (req.query.status) filter.status = req.query.status;
    const applicants = await Applicant.find(filter).populate('circularId', 'title classOrGrade').sort({ createdAt: -1 });
    res.json({ success: true, count: applicants.length, data: applicants });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplicantById = async (req, res) => {
  try {
    const applicant = await Applicant.findOne({ _id: req.params.id, schoolId: req.user.schoolId }).populate('circularId', 'title classOrGrade');
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });
    res.json({ success: true, data: applicant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateApplicantStatus = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const applicant = await Applicant.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      { status, reviewNote },
      { new: true, runValidators: true }
    );
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });
    res.json({ success: true, data: applicant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.publishResult = async (req, res) => {
  try {
    const applicant = await Applicant.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      { resultPublished: true },
      { new: true }
    ).populate('circularId', 'title classOrGrade');
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });

    const decision = applicant.status === 'approved' ? 'approved' : applicant.status === 'rejected' ? 'not approved' : 'reviewed';
    await sendEmail({
      to: applicant.guardianEmail,
      subject: `Admission result published - ${applicant.circularId?.title || 'Your application'}`,
      html: `<p>Hi ${applicant.guardianName},</p>` +
        `<p>The admission result for <strong>${applicant.studentName}</strong> has been published. ` +
        `Your application has been <strong>${decision}</strong>.</p>` +
        `<p>Please log in to the admissions portal for full details.</p>`,
      category: 'admission_result_published',
      school: applicant.schoolId,
    });

    res.json({ success: true, data: applicant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getResultsByCircular = async (req, res) => {
  try {
    const results = await Applicant.find({ circularId: req.params.circularId, resultPublished: true }).select('studentName status');
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
