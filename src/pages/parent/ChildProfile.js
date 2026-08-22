import { useEffect, useState } from 'react';
import { api } from '../../api/StudentApi';

const PARENT_EDITABLE_FIELDS = ['guardianPhone', 'guardianEmail', 'address', 'photoUrl'];

export default function ChildProfile() {
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // parentUserId on the backend links a Student doc to the logged-in parent's account
  const childId = localStorage.getItem('childId');

  const fetchChild = () => {
    setLoading(true);
    api.get(`/students/${childId}`).then((res) => {
      setStudent(res.data);
      setForm(res.data);
    }).finally(() => setLoading(false));
  };
  useEffect(fetchChild, [childId]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updates = {};
      PARENT_EDITABLE_FIELDS.forEach((f) => { updates[f] = form[f]; });
      await api.patch(`/students/${childId}`, updates);
      setEditing(false);
      setSuccess(true);
      fetchChild();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-600">Loading…</div>;
  if (!student) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-red-500">No student record linked to this account.</div>;

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">My Child's Profile</h1>
        <p className="text-blue-500 text-sm mb-6">You can view all details and update contact information below.</p>

        {success && <div className="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-lg mb-4">Profile updated successfully.</div>}
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-blue-700 text-white px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{student.name}</h2>
              <p className="text-blue-100 text-sm">{student.studentId} · Class {student.currentClass}-{student.section}</p>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="bg-white text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              {editing ? 'Cancel' : 'Update contact info'}
            </button>
          </div>

          <div className="p-6">
            {/* Read-only, admin-managed fields */}
            <h3 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Academic Info (view only)</h3>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <ReadField label="Class" value={`${student.currentClass} - ${student.section}`} />
              <ReadField label="Roll number" value={student.rollNumber} />
              <ReadField label="Status" value={student.status} />
              <ReadField label="Admission date" value={new Date(student.admissionDate).toLocaleDateString()} />
            </div>

            {/* Parent-editable fields */}
            <h3 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Contact Info (editable by you)</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Guardian phone</p>
                {editing ? (
                  <input name="guardianPhone" value={form.guardianPhone || ''} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-sm text-blue-900 font-medium">{student.guardianPhone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Guardian email</p>
                {editing ? (
                  <input name="guardianEmail" value={form.guardianEmail || ''} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-sm text-blue-900 font-medium">{student.guardianEmail || '—'}</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                {editing ? (
                  <input name="address" value={form.address || ''} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-sm text-blue-900 font-medium">{student.address}</p>
                )}
              </div>
            </div>

            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-blue-900 font-medium capitalize">{value || '—'}</p>
    </div>
  );
}
