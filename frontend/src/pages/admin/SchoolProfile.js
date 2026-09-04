import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../context/AuthContext';
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
    return <span className="text-xs font-medium text-green-600 ml-2">✓ Verified</span>;
  }
  return (
    <button type="button" onClick={onStartVerify} className="text-xs font-medium text-indigo-600 underline ml-2">
      Verify {label}
    </button>
  );
}

export default function SchoolProfile() {
  const { isDark } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [completeness, setCompleteness] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);

  const [tab, setTab] = useState('edit');
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [verify, setVerify] = useState(null);

  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const label = isDark ? 'text-slate-300' : 'text-slate-600';
  const input = `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
  }`;

  const applyProfileResponse = (school, completenessData, warningsData, pendingData) => {
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
        const { school, completeness: c, warnings: w, pendingChanges: p } = res.data;
        applyProfileResponse(school, c, w, p);
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load school profile' }))
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

  const addPhone = () => setField('additionalPhones', [...form.additionalPhones, '']);
  const updatePhone = (i, v) => {
    const list = [...form.additionalPhones];
    list[i] = v;
    setField('additionalPhones', list);
  };
  const removePhone = (i) => setField('additionalPhones', form.additionalPhones.filter((_, idx) => idx !== i));

  const addEmail = () => setField('additionalEmails', [...form.additionalEmails, '']);
  const updateEmail = (i, v) => {
    const list = [...form.additionalEmails];
    list[i] = v;
    setField('additionalEmails', list);
  };
  const removeEmail = (i) => setField('additionalEmails', form.additionalEmails.filter((_, idx) => idx !== i));

  const addSocialLink = () => setField('socialLinks', [...form.socialLinks, { platform: '', url: '' }]);
  const updateSocialLink = (i, f, v) => {
    const links = [...form.socialLinks];
    links[i] = { ...links[i], [f]: v };
    setField('socialLinks', links);
  };
  const removeSocialLink = (i) => setField('socialLinks', form.socialLinks.filter((_, idx) => idx !== i));

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
        socialLinks: form.socialLinks.filter((l) => l.platform || l.url),
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

  const startVerify = (type) => setVerify({ type, code: '', devCode: null, loading: false, error: null, sent: false });
  const closeVerify = () => setVerify(null);

  const sendVerifyCode = async () => {
    setVerify((v) => ({ ...v, loading: true, error: null }));
    try {
      const res = verify.type === 'email' ? await schoolApi.requestEmailVerification() : await schoolApi.requestPhoneVerification();
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
    } catch (err) {
      setVerify((v) => ({ ...v, loading: false, error: err.response?.data?.message || 'Incorrect code' }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <p className={label}>Loading school profile…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>School Profile</h1>
          <p className={`text-sm mt-1 ${label}`}>
            Institution identity, leadership, and contact details shown on your public website and generated documents.
            {status && status !== 'active' && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">{status}</span>
            )}
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {completeness && (
          <div className={`rounded-2xl border p-5 ${card}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Profile completeness</p>
              <span className="text-sm font-bold text-indigo-500">{completeness.percent}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${completeness.percent}%` }} />
            </div>
            {completeness.missing?.length > 0 && (
              <p className={`text-xs mt-2 ${label}`}>
                Still missing: {completeness.missing.map((m) => m.label).join(', ')}
              </p>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 space-y-1">
            {warnings.map((w) => (
              <p key={w.key} className="text-sm text-yellow-800">⚠ {w.text}</p>
            ))}
          </div>
        )}

        {pendingChanges.length > 0 && (
          <div className="rounded-2xl border border-indigo-300 bg-indigo-50 p-4 space-y-1">
            <p className="text-sm font-semibold text-indigo-800">Awaiting Super Admin approval</p>
            {pendingChanges.map((c) => (
              <p key={c._id} className="text-xs text-indigo-700">
                {FIELD_LABELS[c.field] || c.field}: "{formatValue(c.oldValue)}" → "{formatValue(c.newValue)}"
              </p>
            ))}
          </div>
        )}

        {updatedAt && <p className={`text-xs ${label}`}>Last updated {new Date(updatedAt).toLocaleString()}</p>}

        <div className={`flex gap-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {['edit', 'history'].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-indigo-500 text-indigo-500' : 'border-transparent ' + label
              }`}
            >
              {t === 'edit' ? 'Edit Profile' : 'Version History'}
            </button>
          ))}
        </div>

        {tab === 'edit' && (
          <form onSubmit={handleSave} className={`rounded-2xl border p-6 space-y-5 ${card}`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${label}`}>
                  School name {SENSITIVE_FIELDS.includes('name') && <span className="text-yellow-500">(needs approval)</span>}
                </label>
                <input className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className={`text-xs font-medium ${label}`}>
                  EIIN {SENSITIVE_FIELDS.includes('eiin') && <span className="text-yellow-500">(needs approval)</span>}
                </label>
                <input className={input} value={form.eiin} onChange={(e) => setField('eiin', e.target.value)} />
                {fieldErrors.eiin && <p className="text-xs text-red-500 mt-1">{fieldErrors.eiin}</p>}
              </div>
              <div>
                <label className={`text-xs font-medium ${label}`}>Institution code</label>
                <input className={input} value={form.institutionCode} onChange={(e) => setField('institutionCode', e.target.value)} />
              </div>
              <div>
                <label className={`text-xs font-medium ${label}`}>Establishment year</label>
                <input type="number" className={input} value={form.establishmentYear} onChange={(e) => setField('establishmentYear', e.target.value)} />
                {fieldErrors.establishmentYear && <p className="text-xs text-red-500 mt-1">{fieldErrors.establishmentYear}</p>}
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium ${label}`}>
                Address {SENSITIVE_FIELDS.includes('address') && <span className="text-yellow-500">(needs approval)</span>}
              </label>
              <input className={input} value={form.address} onChange={(e) => setField('address', e.target.value)} />
              {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${label} flex items-center`}>
                  Primary phone <VerifyBadge verified={phoneVerified} label="phone" onStartVerify={() => startVerify('phone')} />
                </label>
                <input className={input} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className={`text-xs font-medium ${label} flex items-center`}>
                  Primary email <VerifyBadge verified={emailVerified} label="email" onStartVerify={() => startVerify('email')} />
                </label>
                <input className={input} value={form.email} onChange={(e) => setField('email', e.target.value)} />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium ${label}`}>Emergency contact</label>
              <input className={input} value={form.emergencyContact} onChange={(e) => setField('emergencyContact', e.target.value)} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-medium ${label}`}>Additional phone numbers</label>
                <button type="button" onClick={addPhone} className="text-xs text-indigo-500 font-medium">+ Add</button>
              </div>
              {form.additionalPhones.map((p, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <input className={input} value={p} onChange={(e) => updatePhone(i, e.target.value)} />
                  <button type="button" onClick={() => removePhone(i)} className="text-xs text-red-500">Remove</button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-medium ${label}`}>Additional email addresses</label>
                <button type="button" onClick={addEmail} className="text-xs text-indigo-500 font-medium">+ Add</button>
              </div>
              {form.additionalEmails.map((em, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <input className={input} value={em} onChange={(e) => updateEmail(i, e.target.value)} />
                  <button type="button" onClick={() => removeEmail(i)} className="text-xs text-red-500">Remove</button>
                </div>
              ))}
            </div>

            <div>
              <label className={`text-xs font-medium ${label}`}>
                Principal's name {SENSITIVE_FIELDS.includes('principalName') && <span className="text-yellow-500">(needs approval)</span>}
              </label>
              <input className={input} value={form.principalName} onChange={(e) => setField('principalName', e.target.value)} />
            </div>
            <div>
              <label className={`text-xs font-medium ${label}`}>Principal's message</label>
              <textarea className={input} rows={3} value={form.principalMessage} onChange={(e) => setField('principalMessage', e.target.value)} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-medium ${label}`}>Social media links</label>
                <button type="button" onClick={addSocialLink} className="text-xs text-indigo-500 font-medium">+ Add</button>
              </div>
              {form.socialLinks.map((l, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <input className={input} placeholder="platform (facebook, youtube...)" value={l.platform} onChange={(e) => updateSocialLink(i, 'platform', e.target.value)} />
                  <input className={input} placeholder="https://..." value={l.url} onChange={(e) => updateSocialLink(i, 'url', e.target.value)} />
                  <button type="button" onClick={() => removeSocialLink(i)} className="text-xs text-red-500 shrink-0">Remove</button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}

        {tab === 'history' && (
          <div className={`rounded-2xl border p-6 ${card}`}>
            {historyLoading && <p className={label}>Loading history…</p>}
            {!historyLoading && history?.length === 0 && <p className={label}>No changes recorded yet.</p>}
            {!historyLoading && history?.length > 0 && (
              <div className="space-y-3">
                {history.map((c) => (
                  <div key={c._id} className={`rounded-lg border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {FIELD_LABELS[c.field] || c.field}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${label}`}>
                      "{formatValue(c.oldValue)}" → "{formatValue(c.newValue)}"
                    </p>
                    <p className={`text-[11px] mt-1 ${label}`}>
                      {c.changedByName} ({c.changedByRole}) · {new Date(c.createdAt).toLocaleString()}
                    </p>
                    {(c.status === 'approved' || c.status === 'auto_approved') && (
                      <button
                        onClick={() => handleRestore(c._id)}
                        disabled={restoringId === c._id}
                        className="text-xs text-indigo-500 font-medium mt-2"
                      >
                        {restoringId === c._id ? 'Restoring…' : 'Restore this value'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {verify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 ${card}`}>
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Verify {verify.type === 'email' ? 'email address' : 'phone number'}
            </h3>
            <p className={`text-xs mb-4 ${label}`}>
              We'll send a 6-digit code to your {verify.type === 'email' ? 'primary email' : 'primary phone'}.
            </p>

            {verify.error && <p className="text-xs text-red-500 mb-2">{verify.error}</p>}

            {!verify.sent ? (
              <button
                onClick={sendVerifyCode}
                disabled={verify.loading}
                className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {verify.loading ? 'Sending…' : 'Send code'}
              </button>
            ) : (
              <>
                {verify.devCode && (
                  <p className="text-xs mb-2 text-yellow-600">
                    Dev mode: SMS gateway not configured. Your code is <strong>{verify.devCode}</strong>.
                  </p>
                )}
                <input
                  className={input + ' mb-3'}
                  placeholder="Enter 6-digit code"
                  value={verify.code}
                  onChange={(e) => setVerify((v) => ({ ...v, code: e.target.value }))}
                />
                <button
                  onClick={confirmVerifyCode}
                  disabled={verify.loading || verify.code.length < 4}
                  className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {verify.loading ? 'Confirming…' : 'Confirm'}
                </button>
              </>
            )}

            <button onClick={closeVerify} className={`w-full mt-2 py-2 text-xs ${label}`}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
