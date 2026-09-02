const School = require('../models/School');
const User = require('../models/User');
const ProfileChange = require('../models/ProfileChange');
const { sendEmail } = require('../services/email.service');
const {
  isValidEIIN,
  isNonEmpty,
  isValidEmail,
  isValidOptionalEmail,
  isValidBDPhone,
  isValidOptionalBDPhone,
  isValidSocialLink,
  SENSITIVE_FIELDS,
  generateVerificationCode,
} = require('../utils/profileValidators');

// Fields a School Admin can edit through the School Profile module.
// This is the single source of truth for institutional information -
// name, EIIN, leadership, contact details, address, and social links.
//
// Not every field is applied the same way: SENSITIVE_FIELDS (see
// profileValidators.js) go through a Super Admin approval workflow before
// they take effect, everything else is applied instantly. Both paths are
// recorded in ProfileChange so there's a full audit trail either way.
const PROFILE_FIELDS = [
  'name',
  'eiin',
  'institutionCode',
  'establishmentYear',
  'address',
  'phone',
  'additionalPhones',
  'email',
  'additionalEmails',
  'emergencyContact',
  'principalName',
  'principalMessage',
  'socialLinks',
];

// Fields that are safe to show on the public website / in generated
// documents. Internal-only fields (verification codes, status metadata,
// etc.) are intentionally left out.
const PUBLIC_PROFILE_FIELDS =
  'name eiin institutionCode establishmentYear address phone additionalPhones ' +
  'email additionalEmails phoneVerified emailVerified principalName principalMessage ' +
  'socialLinks logoUrl bannerUrl subdomain';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------
// Completeness / warnings
// ---------------------------------------------------------------------

// Works out how complete a profile is, and which recommended fields are
// still missing, so the admin gets a quick "what's left to fill in" signal.
function computeCompleteness(school) {
  const checklist = [
    { key: 'name', label: 'School name', filled: !!school.name },
    { key: 'eiin', label: 'EIIN', filled: !!school.eiin },
    { key: 'address', label: 'Address', filled: !!school.address },
    { key: 'phone', label: 'Primary phone number', filled: !!school.phone },
    { key: 'email', label: 'Primary email address', filled: !!school.email },
    { key: 'principalName', label: "Principal's name", filled: !!school.principalName },
    { key: 'principalMessage', label: "Principal's message", filled: !!school.principalMessage },
    { key: 'logoUrl', label: 'School logo', filled: !!school.logoUrl },
    {
      key: 'socialLinks',
      label: 'At least one social media link',
      filled: (school.socialLinks || []).length > 0,
    },
    {
      key: 'emergencyContact',
      label: 'Emergency contact number',
      filled: !!school.emergencyContact,
    },
  ];

  const filledCount = checklist.filter((item) => item.filled).length;
  const percent = Math.round((filledCount / checklist.length) * 100);

  return {
    percent,
    missing: checklist.filter((item) => !item.filled).map((item) => ({ key: item.key, label: item.label })),
  };
}

// Operational, actionable issues - distinct from completeness (which is
// about *optional* fields being blank). These are things an admin should
// probably act on soon.
function computeWarnings(school, pendingCount) {
  const warnings = [];

  if (!school.emailVerified) {
    warnings.push({ key: 'email_unverified', text: "Primary email address hasn't been verified yet." });
  }
  if (!school.phoneVerified) {
    warnings.push({ key: 'phone_unverified', text: "Primary phone number hasn't been verified yet." });
  }
  if (pendingCount > 0) {
    warnings.push({
      key: 'pending_changes',
      text: `${pendingCount} sensitive field change${pendingCount > 1 ? 's are' : ' is'} awaiting Super Admin approval.`,
    });
  }

  const staleAfterMs = 180 * 24 * 60 * 60 * 1000; // 180 days
  if (!school.profileUpdatedAt || Date.now() - new Date(school.profileUpdatedAt).getTime() > staleAfterMs) {
    warnings.push({ key: 'stale_profile', text: "This profile hasn't been reviewed or updated in over 180 days." });
  }

  return warnings;
}

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------

// Validates the incoming profile payload. Returns a { field: message } map;
// an empty object means the payload is valid.
function validateProfilePayload(body) {
  const errors = {};

  if (body.name !== undefined) {
    const nameErr = isNonEmpty(body.name, 'School name');
    if (nameErr) errors.name = nameErr;
  }

  if (body.eiin !== undefined) {
    const eiinErr = isValidEIIN(body.eiin);
    if (eiinErr) errors.eiin = eiinErr;
  }

  if (body.address !== undefined) {
    const addressErr = isNonEmpty(body.address, 'Address');
    if (addressErr) errors.address = addressErr;
  }

  if (body.phone !== undefined) {
    const phoneErr = isValidBDPhone(body.phone);
    if (phoneErr) errors.phone = phoneErr;
  }

  if (Array.isArray(body.additionalPhones)) {
    body.additionalPhones.forEach((num, i) => {
      const err = isValidOptionalBDPhone(num);
      if (err) errors[`additionalPhones.${i}`] = err;
    });
  }

  if (body.email !== undefined) {
    const emailErr = isValidEmail(body.email);
    if (emailErr) errors.email = emailErr;
  }

  if (Array.isArray(body.additionalEmails)) {
    body.additionalEmails.forEach((addr, i) => {
      const err = isValidOptionalEmail(addr);
      if (err) errors[`additionalEmails.${i}`] = err;
    });
  }

  if (body.emergencyContact) {
    const err = isValidOptionalBDPhone(body.emergencyContact);
    if (err) errors.emergencyContact = err;
  }

  if (Array.isArray(body.socialLinks)) {
    body.socialLinks.forEach((link, i) => {
      const err = isValidSocialLink(link);
      if (err) errors[`socialLinks.${i}`] = err;
    });
  }

  if (body.establishmentYear !== undefined && body.establishmentYear !== null && body.establishmentYear !== '') {
    const year = Number(body.establishmentYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
      errors.establishmentYear = `Enter a valid year between 1800 and ${currentYear}`;
    }
  }

  return errors;
}

function valuesEqual(a, b) {
  // Cheap but effective for the mix of strings/numbers/arrays/objects we
  // deal with here (socialLinks, additionalPhones/Emails, plain scalars).
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

// ---------------------------------------------------------------------
// Profile read/update
// ---------------------------------------------------------------------

// @route GET /api/school/profile
// @access Protected - school_admin (their own school, via req.schoolId)
const getMyProfile = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const pendingChanges = await ProfileChange.find({ school: school._id, status: 'pending' })
      .sort('-createdAt')
      .lean();

    res.json({
      school,
      completeness: computeCompleteness(school),
      warnings: computeWarnings(school, pendingChanges.length),
      pendingChanges,
    });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/school/profile
// @access Protected - school_admin
// Validates every field, checks EIIN uniqueness, then splits the changed
// fields into two lanes:
//   - Non-sensitive fields are applied immediately (instant update, per the
//     functional requirement that admins can update most fields and have
//     them reflected right away across the platform).
//   - Sensitive fields (name, EIIN, principal, address) are queued as a
//     ProfileChange with status 'pending' and only take effect once a
//     Super Admin approves them.
// Every change (instant or queued) is written to ProfileChange, so the
// School Profile has a full, auditable version history either way.
const updateMyProfile = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const errors = validateProfilePayload(req.body);

    // EIIN must stay unique across schools if it's being changed.
    if (req.body.eiin !== undefined && !errors.eiin) {
      const trimmedEiin = String(req.body.eiin).trim();
      if (trimmedEiin !== school.eiin) {
        const clash = await School.findOne({ eiin: trimmedEiin, _id: { $ne: school._id } });
        if (clash) {
          errors.eiin = 'Another school is already registered with this EIIN';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Please fix the highlighted fields', errors });
    }

    const actor = await User.findById(req.user.id);
    const appliedFields = [];
    const pendingFields = [];

    for (const field of PROFILE_FIELDS) {
      if (req.body[field] === undefined) continue;

      const newValue = req.body[field];
      const oldValue = school[field];
      if (valuesEqual(oldValue, newValue)) continue; // no-op, nothing to log

      if (SENSITIVE_FIELDS.includes(field)) {
        // Upsert so re-submitting the same field while a request is still
        // pending updates that request instead of stacking duplicates.
        await ProfileChange.findOneAndUpdate(
          { school: school._id, field, status: 'pending' },
          {
            school: school._id,
            field,
            oldValue,
            newValue,
            status: 'pending',
            changedBy: actor?._id,
            changedByName: actor?.name,
            changedByRole: actor?.role,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        pendingFields.push(field);
      } else {
        school[field] = newValue;
        // A verification badge shouldn't survive a silent field change.
        if (field === 'phone') school.phoneVerified = false;
        if (field === 'email') school.emailVerified = false;

        await ProfileChange.create({
          school: school._id,
          field,
          oldValue,
          newValue,
          status: 'auto_approved',
          changedBy: actor?._id,
          changedByName: actor?.name,
          changedByRole: actor?.role,
        });
        appliedFields.push(field);
      }
    }

    if (appliedFields.length > 0) {
      school.profileUpdatedAt = new Date();
      await school.save();
    }

    let message;
    if (appliedFields.length === 0 && pendingFields.length === 0) {
      message = 'No changes detected.';
    } else if (pendingFields.length > 0) {
      message =
        `Profile updated. ${pendingFields.join(', ')} ` +
        `${pendingFields.length > 1 ? 'require' : 'requires'} Super Admin approval before going live.`;
    } else {
      message = 'School profile updated. Changes are now live across the platform.';
    }

    const pendingChanges = await ProfileChange.find({ school: school._id, status: 'pending' })
      .sort('-createdAt')
      .lean();

    res.json({
      message,
      school,
      appliedFields,
      pendingFields,
      completeness: computeCompleteness(school),
      warnings: computeWarnings(school, pendingChanges.length),
      pendingChanges,
    });
  } catch (error) {
    // Mongoose's own unique-index error on eiin/subdomain, as a fallback
    // in case of a race condition past the check above.
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Another school already uses one of these values (e.g. EIIN)' });
    }
    next(error);
  }
};

// ---------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------

// @route GET /api/school/profile/history
// @access Protected - school_admin
const getProfileHistory = async (req, res, next) => {
  try {
    const history = await ProfileChange.find({
      school: req.schoolId,
      status: { $in: ['approved', 'rejected', 'auto_approved'] },
    })
      .sort('-createdAt')
      .limit(100)
      .populate('reviewedBy', 'name role');

    res.json(history);
  } catch (error) {
    next(error);
  }
};

// @route POST /api/school/profile/history/:id/restore
// @access Protected - school_admin
// Reverts a single field back to the value it held *before* the selected
// change. Restoring a sensitive field still goes through Super Admin
// approval, same as any other edit to that field - there's no bypass.
const restoreProfileVersion = async (req, res, next) => {
  try {
    const change = await ProfileChange.findOne({
      _id: req.params.id,
      school: req.schoolId,
      status: { $in: ['approved', 'auto_approved'] },
    });
    if (!change) return res.status(404).json({ message: 'History entry not found' });

    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const { field } = change;
    const restoredValue = change.oldValue;
    const currentValue = school[field];

    if (valuesEqual(currentValue, restoredValue)) {
      return res.status(400).json({ message: 'The profile already has this value for that field.' });
    }

    const actor = await User.findById(req.user.id);
    let responseMessage;

    if (SENSITIVE_FIELDS.includes(field)) {
      await ProfileChange.findOneAndUpdate(
        { school: school._id, field, status: 'pending' },
        {
          school: school._id,
          field,
          oldValue: currentValue,
          newValue: restoredValue,
          status: 'pending',
          changedBy: actor?._id,
          changedByName: actor?.name,
          changedByRole: actor?.role,
          restoredFromChangeId: change._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      responseMessage = `Restore request for "${field}" submitted and is awaiting Super Admin approval.`;
    } else {
      school[field] = restoredValue;
      if (field === 'phone') school.phoneVerified = false;
      if (field === 'email') school.emailVerified = false;
      school.profileUpdatedAt = new Date();
      await school.save();

      await ProfileChange.create({
        school: school._id,
        field,
        oldValue: currentValue,
        newValue: restoredValue,
        status: 'auto_approved',
        changedBy: actor?._id,
        changedByName: actor?.name,
        changedByRole: actor?.role,
        restoredFromChangeId: change._id,
      });
      responseMessage = `"${field}" restored to its previous value.`;
    }

    res.json({ message: responseMessage, school });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Contact verification
// ---------------------------------------------------------------------

// @route POST /api/school/profile/verify/email/request
const requestEmailVerification = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const code = generateVerificationCode();
    school.emailVerificationCode = code;
    school.emailVerificationExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    await school.save();

    await sendEmail({
      to: school.email,
      subject: "Verify your school's email address - Amar School",
      html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    });

    res.json({ message: `Verification code sent to ${school.email}.` });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/school/profile/verify/email/confirm  { code }
const confirmEmailVerification = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId).select('+emailVerificationCode +emailVerificationExpires');
    if (!school) return res.status(404).json({ message: 'School not found' });

    if (
      !school.emailVerificationCode ||
      !school.emailVerificationExpires ||
      school.emailVerificationExpires < new Date()
    ) {
      return res.status(400).json({ message: 'No active verification code. Please request a new one.' });
    }
    if (String(req.body.code).trim() !== school.emailVerificationCode) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    school.emailVerified = true;
    school.emailVerificationCode = undefined;
    school.emailVerificationExpires = undefined;
    await school.save();

    res.json({ message: 'Email address verified.', emailVerified: true });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/school/profile/verify/phone/request
// No SMS gateway is wired up yet, so - purely for demo purposes - the
// generated code is returned in the response instead of being texted out.
// A real deployment would swap the `devCode` field for an SMS provider call.
const requestPhoneVerification = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    const code = generateVerificationCode();
    school.phoneVerificationCode = code;
    school.phoneVerificationExpires = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    await school.save();

    res.json({
      message: `A verification code was sent to ${school.phone}.`,
      devNote: 'SMS gateway is not configured in this environment, so the code is included here for testing.',
      devCode: code,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/school/profile/verify/phone/confirm  { code }
const confirmPhoneVerification = async (req, res, next) => {
  try {
    const school = await School.findById(req.schoolId).select('+phoneVerificationCode +phoneVerificationExpires');
    if (!school) return res.status(404).json({ message: 'School not found' });

    if (
      !school.phoneVerificationCode ||
      !school.phoneVerificationExpires ||
      school.phoneVerificationExpires < new Date()
    ) {
      return res.status(400).json({ message: 'No active verification code. Please request a new one.' });
    }
    if (String(req.body.code).trim() !== school.phoneVerificationCode) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    school.phoneVerified = true;
    school.phoneVerificationCode = undefined;
    school.phoneVerificationExpires = undefined;
    await school.save();

    res.json({ message: 'Phone number verified.', phoneVerified: true });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------

// @route GET /api/school/profile/public/:subdomain
// @access Public - used by the school website, admission forms, and
// other generated documents that need current, accurate school info.
const getPublicProfile = async (req, res, next) => {
  try {
    const school = await School.findOne({
      subdomain: req.params.subdomain.toLowerCase(),
      status: 'active',
    }).select(PUBLIC_PROFILE_FIELDS);

    if (!school) {
      return res.status(404).json({ message: 'School profile not found or not yet approved' });
    }

    res.json(school);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileHistory,
  restoreProfileVersion,
  requestEmailVerification,
  confirmEmailVerification,
  requestPhoneVerification,
  confirmPhoneVerification,
  getPublicProfile,
  computeCompleteness,
  computeWarnings,
  validateProfilePayload,
};
