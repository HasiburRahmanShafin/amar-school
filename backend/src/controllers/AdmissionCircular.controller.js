const AdmissionCircular = require('../models/AdmissionCircular');
const Applicant = require('../models/Applicant');
const School = require('../models/School');

exports.createCircular = async (req, res) => {
  try {
    const { title, description, classOrGrade, totalSeats, requirements, applicationDeadline, status } = req.body;
    const circular = await AdmissionCircular.create({
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      title, description, classOrGrade, totalSeats, requirements, applicationDeadline,
      status: status || 'draft',
    });
    res.status(201).json({ success: true, data: circular });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getCirculars = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subdomain) {
      const school = await School.findOne({ subdomain: req.query.subdomain });
      if (!school) return res.status(404).json({ success: false, message: 'School not found' });
      filter.schoolId = school._id;
    } else if (req.query.schoolId) {
      filter.schoolId = req.query.schoolId;
    }

    const isAdmin = req.user && req.user.role === 'school_admin';
    if (!isAdmin) filter.status = 'published';

    const circulars = await AdmissionCircular.find(filter).sort({ createdAt: -1 }).lean();

    if (isAdmin) {
      const withCounts = await Promise.all(
        circulars.map(async (c) => ({
          ...c,
          applicantCount: await Applicant.countDocuments({ circularId: c._id }),
        }))
      );
      return res.json({ success: true, count: withCounts.length, data: withCounts });
    }

    res.json({ success: true, count: circulars.length, data: circulars });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCircularById = async (req, res) => {
  try {
    const circular = await AdmissionCircular.findById(req.params.id);
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found' });
    res.json({ success: true, data: circular });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCircular = async (req, res) => {
  try {
    const circular = await AdmissionCircular.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found' });
    res.json({ success: true, data: circular });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCircular = async (req, res) => {
  try {
    const circular = await AdmissionCircular.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    if (!circular) return res.status(404).json({ success: false, message: 'Circular not found' });
    res.json({ success: true, message: 'Circular deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
