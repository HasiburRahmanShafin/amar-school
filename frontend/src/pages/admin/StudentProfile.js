import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import BackButton from '../../components/BackButton';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStudent = () => {
    setLoading(true);
    api.get(`/students/${id}`).then((res) => {
      setStudent(res.data);
      setForm(res.data);
    }).finally(() => setLoading(false));
  };
  useEffect(fetchStudent, [id]);

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

  const inputClass = 'w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-600">Loading…</div>;
  if (!student) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-red-500">Student not found.</div>;

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <BackButton />

        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-blue-700 text-white px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{student.name}</h1>
              <p className="text-blue-100 text-sm">{student.studentId} · Class {student.currentClass}-{student.section}</p>
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
                className="bg-white text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

            <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Date of birth" value={new Date(student.dateOfBirth).toLocaleDateString()} editing={false} />
              <Field label="Gender" name="gender" value={form.gender} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Blood group" name="bloodGroup" value={form.bloodGroup} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Status" value={student.status} editing={false} />
              <Field label="Address" name="address" value={form.address} editing={editing} onChange={handleChange} inputClass={inputClass} full />
            </div>

            <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Guardian Information</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Guardian name" name="guardianName" value={form.guardianName} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Relation" name="guardianRelation" value={form.guardianRelation} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Phone" name="guardianPhone" value={form.guardianPhone} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Email" name="guardianEmail" value={form.guardianEmail} editing={editing} onChange={handleChange} inputClass={inputClass} />
            </div>

            <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Class Assignment</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Field label="Class" name="currentClass" value={form.currentClass} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Section" name="section" value={form.section} editing={editing} onChange={handleChange} inputClass={inputClass} />
              <Field label="Roll number" name="rollNumber" value={form.rollNumber} editing={editing} onChange={handleChange} inputClass={inputClass} />
            </div>

            <h2 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">Academic History</h2>
            <div className="bg-blue-50 rounded-lg divide-y divide-blue-100 mb-6">
              {student.academicHistory?.length ? (
                student.academicHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-blue-900 font-medium">{h.year} — Class {h.class}{h.section ? `-${h.section}` : ''}</span>
                    <span className="text-gray-500">{h.result || '—'}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-400">No history recorded yet.</p>
              )}
            </div>

            {editing && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50"
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
    </div>
  );
}

function Field({ label, name, value, editing, onChange, inputClass, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing && name ? (
        <input name={name} value={value || ''} onChange={onChange} className={inputClass} />
      ) : (
        <p className="text-sm text-blue-900 font-medium">{value || '—'}</p>
      )}
    </div>
  );
}