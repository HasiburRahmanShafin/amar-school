import { useEffect, useState } from 'react';
import { api } from '../../api/ParentAccountApi';
import BackButton from '../../components/BackButton';

export default function CreateParentAccount() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = () => {
    api.get('/parent-accounts/pending').then((res) => setStudents(res.data));
  };
  useEffect(fetchPending, []);

  const openForm = (student) => {
    setSelectedStudent(student);
    setForm({ email: student.guardianEmail || '', password: '' });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/parent-accounts', {
        studentId: selectedStudent._id,
        email: form.email,
        password: form.password,
      });
      setSuccess(`Parent account created for ${selectedStudent.name}'s guardian.`);
      setSelectedStudent(null);
      fetchPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <BackButton />
        <h1 className="text-2xl font-bold text-blue-900 mb-1">Create Parent Login Accounts</h1>
        <p className="text-blue-500 text-sm mb-6">Students without a parent account yet are listed below.</p>

        {success && <div className="bg-blue-50 text-blue-700 text-sm px-4 py-3 rounded-lg mb-4">{success}</div>}

        {selectedStudent && (
          <div className="bg-white border border-blue-100 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="font-semibold text-blue-900 mb-4">
              Create login for {selectedStudent.name}'s guardian ({selectedStudent.guardianName})
            </h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Temporary password</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-700 text-white font-medium px-5 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? 'Creating…' : 'Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-500 text-sm font-medium hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-blue-100 rounded-xl overflow-hidden divide-y divide-blue-50">
          {students.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">All students have parent accounts.</p>
          ) : (
            students.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-blue-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.studentId} · Class {s.currentClass}-{s.section} · Guardian: {s.guardianName}</p>
                </div>
                <button
                  onClick={() => openForm(s)}
                  className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800"
                >
                  Create login
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}