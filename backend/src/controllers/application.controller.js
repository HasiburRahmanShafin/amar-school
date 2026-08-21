const Applicant = require('../models/Applicant');
const AdmissionCircular = require('../models/AdmissionCircular');

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
    );
    if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });
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
