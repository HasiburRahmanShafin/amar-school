import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as schoolApi from '../../api/schoolApi';

const emptyForm = {
  name: '',
  eiin: '',
  institutionCode: '',
  establishmentYear: '',
  address: '',
  phone: '',
  additionalPhones: [],
  email: '',
  additionalEmails: [],
  emergencyContact: '',
  principalName: '',
  principalMessage: '',
  socialLinks: [],
};

const SENSITIVE_FIELDS = ['name', 'eiin', 'principalName', 'address'];

const FIELD_LABELS = {
  name: 'School name',
  eiin: 'EIIN',
  institutionCode: 'Institution code',
  establishmentYear: 'Establishment year',
  address: 'Address',
  phone: 'Primary phone',
  additionalPhones: 'Additional phone numbers',
  email: 'Primary email',
  additionalEmails: 'Additional email addresses',
  emergencyContact: 'Emergency contact',
  principalName: "Principal's name",
  principalMessage: "Principal's message",
  socialLinks: 'Social media links',
};

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    if (typeof value[0] === 'object') return value.map((v) => `${v.platform}: ${v.url}`).join(', ');
    return value.join(', ');
  }
  return String(value);
}

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  auto_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  pending: 'Pending approval',
  approved: 'Approved',
  auto_approved: 'Applied instantly',
  rejected: 'Rejected',
};

function VerifyBadge({ verified, label, onStartVerify }) {
  if (verified) {
    return <span className="text-xs font-medium text-green-700 ml-2">✓ Verified</span>;
  }
  return (
    <button
      type="button"
      onClick={onStartVerify}
      className="text-xs font-medium text-blue-600 underline ml-2"
    >
      Verify {label}
    </button>
  );
}

function SchoolProfile() {
  const [form, setForm] = useState(emptyForm);
  const [subdomain, setSubdomain] = useState('');
  const [status, setStatus] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [completeness, setCompleteness] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);

  const [tab, setTab] = useState('edit'); // 'edit' | 'history'
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [fieldErrors, setFieldErrors] = useState({});

  // Contact verification flow: { type: 'email'|'phone', code, devCode, loading, error }
  const [verify, setVerify] = useState(null);

  const applyProfileResponse = (school, completenessData, warningsData, pendingData) => {
    setSubdomain(school.subdomain);
    setStatus(school.status);
    setUpdatedAt(school.profileUpdatedAt || null);
    setPhoneVerified(!!school.phoneVerified);
    setEmailVerified(!!school.emailVerified);
    setCompleteness(completenessData);
    setWarnings(warningsData || []);
    setPendingChanges(pendingData || []);
    setForm({
      name: school.name || '',
      eiin: school.eiin || '',
      institutionCode: school.institutionCode || '',
      establishmentYear: school.establishmentYear || '',
      address: school.address || '',
      phone: school.phone || '',
      additionalPhones: school.additionalPhones || [],
      email: school.email || '',
      additionalEmails: school.additionalEmails || [],
      emergencyContact: school.emergencyContact || '',
      principalName: school.principalName || '',
      principalMessage: school.principalMessage || '',
      socialLinks: school.socialLinks || [],
    });
  };

  const loadProfile = () => {
    setLoading(true);
    return schoolApi
      .getMyProfile()
      .then((res) => {
        const { school, completeness: completenessData, warnings: warningsData, pendingChanges: pendingData } = res.data;
        applyProfileResponse(school, completenessData, warningsData, pendingData);
      })
      .catch((err) => {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load school profile' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = () => {
    setHistoryLoading(true);
    schoolApi
      .getHistory()
      .then((res) => setHistory(res.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load history' }))
      .finally(() => setHistoryLoading(false));
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    if (nextTab === 'history' && history === null) loadHistory();
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ---- Additional phone numbers ----
  const addPhone = () => setField('additionalPhones', [...form.additionalPhones, '']);
  const updatePhone = (index, value) => {
    const list = [...form.additionalPhones];
    list[index] = value;
    setField('additionalPhones', list);
  };
  const removePhone = (index) =>
    setField('additionalPhones', form.additionalPhones.filter((_, i) => i !== index));

  // ---- Additional emails ----
  const addEmail = () => setField('additionalEmails', [...form.additionalEmails, '']);
  const updateEmail = (index, value) => {
    const list = [...form.additionalEmails];
    list[index] = value;
    setField('additionalEmails', list);
  };
  const removeEmail = (index) =>
    setField('additionalEmails', form.additionalEmails.filter((_, i) => i !== index));

  // ---- Social links ----
  const addSocialLink = () => setField('socialLinks', [...form.socialLinks, { platform: '', url: '' }]);
  const updateSocialLink = (index, field, value) => {
    const links = [...form.socialLinks];
    links[index] = { ...links[index], [field]: value };
    setField('socialLinks', links);
  };
  const removeSocialLink = (index) =>
    setField('socialLinks', form.socialLinks.filter((_, i) => i !== index));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        establishmentYear: form.establishmentYear ? Number(form.establishmentYear) : null,
        additionalPhones: form.additionalPhones.map((p) => p.trim()).filter(Boolean),
        additionalEmails: form.additionalEmails.map((e2) => e2.trim()).filter(Boolean),
        socialLinks: form.socialLinks.filter((link) => link.platform || link.url),
      };
      const res = await schoolApi.updateMyProfile(payload);
      setMessage({ type: 'success', text: res.data.message || 'Profile updated.' });
      applyProfileResponse(res.data.school, res.data.completeness, res.data.warnings, res.data.pendingChanges);
      if (history !== null) loadHistory();
    } catch (err) {
      const data = err.response?.data;
      setMessage({ type: 'error', text: data?.message || 'Failed to save changes' });
      if (data?.errors) setFieldErrors(data.errors);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (changeId) => {
    setRestoringId(changeId);
    setMessage(null);
    try {
      const res = await schoolApi.restoreVersion(changeId);
      setMessage({ type: 'success', text: res.data.message });
      loadProfile();
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to restore this value' });
    } finally {
      setRestoringId(null);
    }
  };

  // ---- Contact verification ----
  const startVerify = (type) => setVerify({ type, code: '', devCode: null, loading: false, error: null });
  const closeVerify = () => setVerify(null);

  const sendVerifyCode = async () => {
    setVerify((v) => ({ ...v, loading: true, error: null }));
    try {
      const res =
        verify.type === 'email' ? await schoolApi.requestEmailVerification() : await schoolApi.requestPhoneVerification();
      setVerify((v) => ({ ...v, loading: false, devCode: res.data.devCode || null, sent: true }));
    } catch (err) {
      setVerify((v) => ({ ...v, loading: false, error: err.response?.data?.message || 'Failed to send code' }));
    }
  };

  const confirmVerifyCode = async () => {
    setVerify((v) => ({ ...v, loading: true, error: null }));
    try {
      if (verify.type === 'email') {
        await schoolApi.confirmEmailVerification(verify.code);
        setEmailVerified(true);
      } else {
        await schoolApi.confirmPhoneVerification(verify.code);
        setPhoneVerified(true);
      }
      setMessage({ type: 'success', text: `${verify.type === 'email' ? 'Email' : 'Phone'} verified.` });
      setVerify(null);
      loadProfile();
    } catch (err) {
      setVerify((v) => ({ ...v, loading: false, error: err.response?.data?.message || 'Verification failed' }));
    }
  };

  const errorFor = (key) => fieldErrors[key];
  const pendingFor = (field) => pendingChanges.find((c) => c.field === field);

  if (loading) return <div className="p-8 text-center">Loading school profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link to="/admin/dashboard" className="text-sm text-blue-600">&larr; Back to Dashboard</Link>
            <h1 className="text-2xl font-bold mt-1">School Profile</h1>
            <p className="text-sm text-gray-500">
              This information powers your public website, official communications, and generated
              documents (admission forms, transfer certificates, and more).
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>
              Status: <span className="capitalize font-semibold">{status}</span>
            </p>
            {updatedAt && <p>Last updated: {new Date(updatedAt).toLocaleString()}</p>}
            <Link to={`/school/${subdomain}`} className="text-blue-600 underline">
              View public website &rarr;
            </Link>
          </div>
        </div>

        {message && (
          <p
            className={`text-sm p-3 rounded mb-4 ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </p>
        )}

        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4">
            <h2 className="font-semibold text-amber-800 mb-2 text-sm">Things worth checking</h2>
            <ul className="text-sm text-amber-800 space-y-1">
              {warnings.map((w) => (
                <li key={w.key}>⚠️ {w.text}</li>
              ))}
            </ul>
          </div>
        )}

        {pendingChanges.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h2 className="font-semibold text-blue-800 mb-2 text-sm">Awaiting Super Admin approval</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              {pendingChanges.map((c) => (
                <li key={c._id}>
                  <strong>{FIELD_LABELS[c.field] || c.field}:</strong> {formatValue(c.oldValue)} &rarr; {formatValue(c.newValue)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {completeness && (
          <div className="bg-white rounded shadow p-5 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Profile Completeness</h2>
              <span className="text-sm font-semibold">{completeness.percent}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            {completeness.missing.length > 0 ? (
              <ul className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-1">
                {completeness.missing.map((item) => (
                  <li key={item.key}>❌ {item.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-700">✓ Your profile is complete.</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => switchTab('edit')}
            className={`px-4 py-1.5 rounded text-sm font-medium ${
              tab === 'edit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => switchTab('history')}
            className={`px-4 py-1.5 rounded text-sm font-medium ${
              tab === 'history' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            Version History
          </button>
        </div>

        {tab === 'edit' && (
          <form onSubmit={handleSave} className="bg-white rounded shadow p-6 space-y-8">
            {/* Institution identity */}
            <section>
              <h2 className="font-semibold mb-1">Institution Identity</h2>
              <p className="text-xs text-gray-500 mb-3">
                Changes to school name and EIIN require Super Admin approval before they go live.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    School Name {SENSITIVE_FIELDS.includes('name') && <span className="text-xs text-amber-600">(needs approval)</span>}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  {pendingFor('name') && (
                    <p className="text-xs text-blue-600 mt-1">
                      Pending: "{formatValue(pendingFor('name').newValue)}"
                    </p>
                  )}
                  {errorFor('name') && <p className="text-xs text-red-600 mt-1">{errorFor('name')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    EIIN <span className="text-xs text-amber-600">(needs approval)</span>
                  </label>
                  <input
                    type="text"
                    value={form.eiin}
                    onChange={(e) => setField('eiin', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  {pendingFor('eiin') && (
                    <p className="text-xs text-blue-600 mt-1">
                      Pending: "{formatValue(pendingFor('eiin').newValue)}"
                    </p>
                  )}
                  {errorFor('eiin') && <p className="text-xs text-red-600 mt-1">{errorFor('eiin')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Institution Code (optional)</label>
                  <input
                    type="text"
                    value={form.institutionCode}
                    onChange={(e) => setField('institutionCode', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Establishment Year (optional)</label>
                  <input
                    type="number"
                    value={form.establishmentYear}
                    onChange={(e) => setField('establishmentYear', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                  {errorFor('establishmentYear') && (
                    <p className="text-xs text-red-600 mt-1">{errorFor('establishmentYear')}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Leadership */}
            <section>
              <h2 className="font-semibold mb-1">Leadership</h2>
              <p className="text-xs text-gray-500 mb-3">
                Principal's name requires Super Admin approval; the principal's message updates instantly.
              </p>
              <label className="block text-sm font-medium mb-1">
                Principal's Name <span className="text-xs text-amber-600">(needs approval)</span>
              </label>
              <input
                type="text"
                value={form.principalName}
                onChange={(e) => setField('principalName', e.target.value)}
                className="w-full border rounded px-3 py-2 mb-1"
              />
              {pendingFor('principalName') && (
                <p className="text-xs text-blue-600 mb-3">
                  Pending: "{formatValue(pendingFor('principalName').newValue)}"
                </p>
              )}
              <label className="block text-sm font-medium mb-1 mt-3">Principal's Message</label>
              <textarea
                value={form.principalMessage}
                onChange={(e) => setField('principalMessage', e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2"
                placeholder="A message from the principal, shown on your public homepage..."
              />
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-semibold mb-3">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center">
                    Primary Phone
                    <VerifyBadge verified={phoneVerified} label="phone" onStartVerify={() => startVerify('phone')} />
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  {errorFor('phone') && <p className="text-xs text-red-600 mt-1">{errorFor('phone')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center">
                    Primary Email
                    <VerifyBadge verified={emailVerified} label="email" onStartVerify={() => startVerify('email')} />
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  {errorFor('email') && <p className="text-xs text-red-600 mt-1">{errorFor('email')}</p>}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Emergency Contact (optional)</label>
                <input
                  type="text"
                  value={form.emergencyContact}
                  onChange={(e) => setField('emergencyContact', e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full md:w-1/2 border rounded px-3 py-2"
                />
                {errorFor('emergencyContact') && (
                  <p className="text-xs text-red-600 mt-1">{errorFor('emergencyContact')}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Additional Phone Numbers</label>
                    <button type="button" onClick={addPhone} className="text-sm text-blue-600">+ Add</button>
                  </div>
                  {form.additionalPhones.map((num, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={num}
                          onChange={(e) => updatePhone(i, e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        {errorFor(`additionalPhones.${i}`) && (
                          <p className="text-xs text-red-600 mt-1">{errorFor(`additionalPhones.${i}`)}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => removePhone(i)} className="text-red-600 text-sm px-2">
                        Remove
                      </button>
                    </div>
                  ))}
                  {form.additionalPhones.length === 0 && (
                    <p className="text-sm text-gray-400">No additional phone numbers.</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Additional Email Addresses</label>
                    <button type="button" onClick={addEmail} className="text-sm text-blue-600">+ Add</button>
                  </div>
                  {form.additionalEmails.map((addr, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <input
                          type="email"
                          value={addr}
                          onChange={(e) => updateEmail(i, e.target.value)}
                          placeholder="office@school.edu.bd"
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                        {errorFor(`additionalEmails.${i}`) && (
                          <p className="text-xs text-red-600 mt-1">{errorFor(`additionalEmails.${i}`)}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => removeEmail(i)} className="text-red-600 text-sm px-2">
                        Remove
                      </button>
                    </div>
                  ))}
                  {form.additionalEmails.length === 0 && (
                    <p className="text-sm text-gray-400">No additional email addresses.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Address */}
            <section>
              <h2 className="font-semibold mb-1">Address <span className="text-xs text-amber-600">(needs approval)</span></h2>
              <label className="block text-sm font-medium mb-1 mt-2">Full Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2"
                required
              />
              {pendingFor('address') && (
                <p className="text-xs text-blue-600 mt-1">
                  Pending: "{formatValue(pendingFor('address').newValue)}"
                </p>
              )}
              {errorFor('address') && <p className="text-xs text-red-600 mt-1">{errorFor('address')}</p>}
              <p className="text-xs text-gray-500 mt-2">
                To set the exact map pin location, use the{' '}
                <Link to="/admin/website-builder" className="text-blue-600 underline">Website Builder</Link>.
              </p>
            </section>

            {/* Social media */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold">Digital Presence / Social Media</h2>
                <button type="button" onClick={addSocialLink} className="text-sm text-blue-600">+ Add link</button>
              </div>
              {form.socialLinks.map((link, index) => (
                <div key={index} className="mb-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Platform (e.g. Facebook)"
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                      className="w-1/3 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(index)}
                      className="text-red-600 text-sm px-2"
                    >
                      Remove
                    </button>
                  </div>
                  {errorFor(`socialLinks.${index}`) && (
                    <p className="text-xs text-red-600 mt-1">{errorFor(`socialLinks.${index}`)}</p>
                  )}
                </div>
              ))}
              {form.socialLinks.length === 0 && <p className="text-sm text-gray-400">No social links added yet.</p>}
            </section>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="font-semibold mb-4">Version History</h2>
            {historyLoading || history === null ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400">No changes recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Field</th>
                      <th className="py-2 pr-3">Change</th>
                      <th className="py-2 pr-3">Changed By</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry._id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                          {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2 pr-3 font-medium">{FIELD_LABELS[entry.field] || entry.field}</td>
                        <td className="py-2 pr-3 text-gray-600">
                          <span className="line-through text-gray-400">{formatValue(entry.oldValue)}</span>
                          {' \u2192 '}
                          <span>{formatValue(entry.newValue)}</span>
                          {entry.restoredFromChangeId && (
                            <span className="text-xs text-gray-400 block">(restored from an earlier version)</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-500">
                          {entry.changedByName || 'Unknown'}
                          {entry.changedByRole && <span className="text-xs block capitalize">{entry.changedByRole.replace('_', ' ')}</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[entry.status] || ''}`}>
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          {entry.status === 'rejected' && entry.reviewNote && (
                            <p className="text-xs text-gray-400 mt-1">Reason: {entry.reviewNote}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {(entry.status === 'approved' || entry.status === 'auto_approved') && (
                            <button
                              type="button"
                              onClick={() => handleRestore(entry._id)}
                              disabled={restoringId === entry._id}
                              className="text-xs text-blue-600 underline disabled:opacity-50"
                            >
                              {restoringId === entry._id ? 'Restoring...' : 'Restore'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact verification modal */}
      {verify && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-sm p-6">
            <h3 className="font-semibold mb-1">Verify {verify.type === 'email' ? 'Email' : 'Phone'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {verify.type === 'email'
                ? `We'll send a 6-digit code to ${form.email}.`
                : `We'll send a 6-digit code to ${form.phone}.`}
            </p>

            {verify.error && <p className="text-sm text-red-600 mb-3">{verify.error}</p>}

            {!verify.sent ? (
              <button
                type="button"
                onClick={sendVerifyCode}
                disabled={verify.loading}
                className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
              >
                {verify.loading ? 'Sending...' : 'Send Code'}
              </button>
            ) : (
              <>
                {verify.devCode && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                    SMS gateway isn't configured in this environment - your demo code is{' '}
                    <strong>{verify.devCode}</strong>.
                  </p>
                )}
                <input
                  type="text"
                  value={verify.code}
                  onChange={(e) => setVerify((v) => ({ ...v, code: e.target.value }))}
                  placeholder="Enter 6-digit code"
                  className="w-full border rounded px-3 py-2 mb-3"
                />
                <button
                  type="button"
                  onClick={confirmVerifyCode}
                  disabled={verify.loading || verify.code.length < 6}
                  className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
                >
                  {verify.loading ? 'Verifying...' : 'Confirm'}
                </button>
              </>
            )}

            <button type="button" onClick={closeVerify} className="w-full text-sm text-gray-500 mt-3">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolProfile;
