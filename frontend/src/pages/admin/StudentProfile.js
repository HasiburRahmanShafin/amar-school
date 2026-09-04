import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import BackButton from '../../components/BackButton';
import AdminLayout from '../../components/layout/AdminLayout';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [fees, setFees] = useState([]);
  const [feeTotals, setFeeTotals] = useState({ totalPaid: 0, totalDue: 0 });
  const [feesLoading, setFeesLoading] = useState(true);
  const [feeForm, setFeeForm] = useState({ feeType: '', amount: '', dueDate: '', academicYear: new Date().getFullYear() });
  const [feeError, setFeeError] = useState('');
  const [addingFee, setAddingFee] = useState(false);

  const fetchStudent = () => {
    setLoading(true);
    api.get(`/students/${id}`).then((res) => {
      setStudent(res.data);
      setForm(res.data);
    }).finally(() => setLoading(false));
  };
  useEffect(fetchStudent, [id]);

  const fetchFees = () => {
    setFeesLoading(true);
    api.get(`/students/${id}/fees`).then((res) => {
      setFees(res.data);
      setFeeTotals(res.totals || { totalPaid: 0, totalDue: 0 });
    }).catch((err) => setFeeError(err.message)).finally(() => setFeesLoading(false));
  };
  useEffect(fetchFees, [id]);

  const handleAddFee = async (e) => {
    e.preventDefault();
    setAddingFee(true);
    setFeeError('');
    try {
      await api.post(`/students/${id}/fees`, feeForm);
      setFeeForm({ feeType: '', amount: '', dueDate: '', academicYear: new Date().getFullYear() });
      fetchFees();
    } catch (err) {
      setFeeError(err.message);
    } finally {
      setAddingFee(false);
    }
  };

  const handleMarkPaid = async (feeId) => {
    try {
      await api.patch(`/students/${id}/fees/${feeId}`, { status: 'paid' });
      fetchFees();
    } catch (err) {
      setFeeError(err.message);
    }
  };

  const feeStatusColor = (status) => ({
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-indigo-100 text-indigo-700',
    overdue: 'bg-red-100 text-red-700',
  }[status] || 'bg-slate-100 text-slate-600');

  // ---- Login accounts (student + parent) ----
  const [loginForms, setLoginForms] = useState({ student: { email: '', password: '' }, parent: { email: '', password: '' } });
  const [loginOpen, setLoginOpen] = useState({ student: false, parent: false });
  const [loginSubmitting, setLoginSubmitting] = useState({ student: false, parent: false });
  const [loginError, setLoginError] = useState({ student: '', parent: '' });
  const [loginSuccess, setLoginSuccess] = useState({ student: '', parent: '' });

  const handleLoginFieldChange = (role, field, value) => {
    setLoginForms((prev) => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
  };

  const handleCreateLogin = async (role) => {
    const { email, password } = loginForms[role];
    setLoginError((prev) => ({ ...prev, [role]: '' }));
    setLoginSuccess((prev) => ({ ...prev, [role]: '' }));

    if (!email || password.length < 6) {
      setLoginError((prev) => ({ ...prev, [role]: 'Enter a valid email and a password of at least 6 characters.' }));
      return;
    }

    setLoginSubmitting((prev) => ({ ...prev, [role]: true }));
    try {
      await api.post(`/students/${id}/logins`, { role, email, password });
      setLoginSuccess((prev) => ({ ...prev, [role]: `${role === 'student' ? 'Student' : 'Parent'} login created.` }));
      setLoginOpen((prev) => ({ ...prev, [role]: false }));
      fetchStudent();
    } catch (err) {
      setLoginError((prev) => ({ ...prev, [role]: err.message }));
    } finally {
      setLoginSubmitting((prev) => ({ ...prev, [role]: false }));
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/students/${id}`, form);
      setEditing(false);
      fetchStudent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this student profile? This cannot be undone.')) return;
    await api.delete(`/students/${id}`);
    navigate('/admin/students');
  };

  const inputClass = 'w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  if (loading) return <AdminLayout><p className="text-sm text-slate-500">Loading…</p></AdminLayout>;
  if (!student) return <AdminLayout><p className="text-sm text-red-500">Student not found.</p></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <BackButton />

        <div className="bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-indigo-700 text-white px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{student.name}</h1>
              <p className="text-indigo-100 text-sm">{student.studentId} · Class {student.currentClass}-{student.section}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/admin/students/${id}/id-card`)}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
              >
                View ID Card
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-white text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Date of birth" value={new Date(student.dateOfBirth).toLocaleDateString()} editing={false} />
              <Field label="Gender" name="gender" value={form.gender} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Blood group" name="bloodGroup" value={form.bloodGroup} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Status" value={student.status} editing={false} />
              <Field label="Address" name="address" value={form.address} editing={editing} onChange={handleChange} inputClass={inputClass} full />
            </div>

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Guardian Information</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Guardian name" name="guardianName" value={form.guardianName} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Relation" name="guardianRelation" value={form.guardianRelation} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Phone" name="guardianPhone" value={form.guardianPhone} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Email" name="guardianEmail" value={form.guardianEmail} editing={editing} onChange={handleChange} inputClass={inputClass} />
            </div>

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Login Accounts</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <LoginAccountBox
                label="Student login"
                connected={!!student.studentUserId}
                open={loginOpen.student}
                setOpen={(v) => setLoginOpen((prev) => ({ ...prev, student: v }))}
                form={loginForms.student}
                onChange={(field, value) => handleLoginFieldChange('student', field, value)}
                onSubmit={() => handleCreateLogin('student')}
                submitting={loginSubmitting.student}
                error={loginError.student}
                success={loginSuccess.student}
                inputClass={inputClass}
              />
              <LoginAccountBox
                label="Parent login"
                connected={!!student.parentUserId}
                open={loginOpen.parent}
                setOpen={(v) => setLoginOpen((prev) => ({ ...prev, parent: v }))}
                form={loginForms.parent}
                onChange={(field, value) => handleLoginFieldChange('parent', field, value)}
                onSubmit={() => handleCreateLogin('parent')}
                submitting={loginSubmitting.parent}
                error={loginError.parent}
                success={loginSuccess.parent}
                inputClass={inputClass}
              />
            </div>

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Class Assignment</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Field label="Class" name="currentClass" value={form.currentClass} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Section" name="section" value={form.section} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Roll number" name="rollNumber" value={form.rollNumber} editing={editing} onChange={handleChange} inputClass={inputClass} />
            </div>

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Academic History</h2>
            <div className="bg-indigo-50 rounded-lg divide-y divide-indigo-100 mb-6">
              {student.academicHistory?.length ? (
                student.academicHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-indigo-900 font-medium">{h.year} — Class {h.class}{h.section ? `-${h.section}` : ''}</span>
                    <span className="text-slate-500">{h.result || '—'}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No history recorded yet.</p>
              )}
            </div>

            <h2 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">Payment Details</h2>
            {feeError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{feeError}</div>}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Total paid</p>
                <p className="text-lg font-semibold text-green-700">{feeTotals.totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500">Total due</p>
                <p className="text-lg font-semibold text-yellow-700">{feeTotals.totalDue.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg divide-y divide-indigo-100 mb-4">
              {feesLoading ? (
                <p className="px-4 py-3 text-sm text-slate-400">Loading payments…</p>
              ) : fees.length ? (
                fees.map((f) => (
                  <div key={f._id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <span className="text-indigo-900 font-medium">{f.feeType}</span>
                      <span className="text-slate-500"> · Due {new Date(f.dueDate).toLocaleDateString()} · {f.academicYear}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-900 font-medium">{f.amount.toLocaleString()}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${feeStatusColor(f.status)}`}>{f.status}</span>
                      {f.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(f._id)}
                          className="text-xs bg-indigo-700 text-white px-2 py-1 rounded-lg hover:bg-indigo-800"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No fee records yet.</p>
              )}
            </div>

            <form onSubmit={handleAddFee} className="grid grid-cols-4 gap-2 mb-6">
              <input
                placeholder="Fee type (e.g. tuition)"
                required
                value={feeForm.feeType}
                onChange={(e) => setFeeForm({ ...feeForm, feeType: e.target.value })}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Amount"
                required
                min="0"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                className={inputClass}
              />
              <input
                type="date"
                required
                value={feeForm.dueDate}
                onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={addingFee}
                className="bg-indigo-700 text-white text-sm font-medium rounded-lg hover:bg-indigo-800 disabled:opacity-50"
              >
                {addingFee ? 'Adding…' : 'Add fee'}
              </button>
            </form>

            {editing && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={handleDelete}
                  className="text-red-500 text-sm font-medium hover:underline ml-auto"
                >
                  Delete student
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, name, value, editing, onChange, inputClass, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {editing && name ? (
        <input name={name} value={value || ''} onChange={onChange} className={inputClass} />
      ) : (
        <p className="text-sm text-indigo-900 font-medium">{value || '—'}</p>
      )}
    </div>
  );
}

function LoginAccountBox({ label, connected, open, setOpen, form, onChange, onSubmit, submitting, error, success, inputClass }) {
  return (
    <div className="bg-indigo-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-indigo-900">{label}</p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
          {connected ? 'Connected' : 'Not set up'}
        </span>
      </div>

      {success && <p className="text-xs text-green-700 mb-2">{success}</p>}

      {connected ? (
        <p className="text-xs text-slate-500">A login account already exists.</p>
      ) : open ? (
        <div className="space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Temporary password (min 6 chars)"
            value={form.password}
            onChange={(e) => onChange('password', e.target.value)}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="text-sm bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create login'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm bg-indigo-700 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800"
        >
          Create login
        </button>
      )}
    </div>
  );
}