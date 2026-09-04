import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

// NOTE: minimal placeholder standing in for Fahmida's Admission Management UI
// (see AdmissionList.js for context). Fully wired to the real
// /api/admissions/circulars endpoints, just not restyled/polished.
const emptyForm = {
  title: '', description: '', classOrGrade: '', totalSeats: '',
  requirements: '', applicationDeadline: '', status: 'draft',
};

export default function ManageCirculars() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { isDark, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const fetchCirculars = () => {
    setLoading(true);
    admissionApi.get('/admissions/circulars')
      .then((res) => setCirculars(res.data))
      .catch((err) => showToast?.(err.message || 'Failed to load circulars', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCirculars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await admissionApi.post('/admissions/circulars', {
        ...form,
        totalSeats: Number(form.totalSeats),
        requirements: form.requirements.split(',').map((s) => s.trim()).filter(Boolean),
      });
      showToast('Circular created', 'success');
      setForm(emptyForm);
      setShowForm(false);
      fetchCirculars();
    } catch (err) {
      showToast(err.message || 'Failed to create circular', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await admissionApi.patch(`/admissions/circulars/${id}`, { status });
      showToast(`Circular ${status}`, 'success');
      fetchCirculars();
    } catch (err) {
      showToast(err.message || 'Failed to update circular', 'error');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await admissionApi.delete(`/admissions/circulars/${id}`);
      showToast('Circular deleted', 'success');
      fetchCirculars();
    } catch (err) {
      showToast(err.message || 'Failed to delete circular', 'error');
    }
  };

  const pageBg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const label = isDark ? 'text-slate-300' : 'text-indigo-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = `w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-indigo-200'
  }`;
  const statusColors = {
    draft: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600',
    published: isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700',
    closed: isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700',
  };

  return (
    <div className={`min-h-screen ${pageBg} py-8 px-6 transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton isDark={isDark} />
          <DarkModeToggle isDark={isDark} toggleDark={toggleTheme} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${heading}`}>Admission Circulars</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-800"
          >
            {showForm ? 'Cancel' : '+ New circular'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className={`border rounded-xl p-6 mb-6 space-y-4 ${cardBg}`}>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Title</label>
              <input name="title" required value={form.title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Description</label>
              <textarea name="description" required value={form.description} onChange={handleChange} rows={3} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Class / grade</label>
                <input name="classOrGrade" required value={form.classOrGrade} onChange={handleChange} className={inputClass} placeholder="6" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Total seats</label>
                <input type="number" min="1" name="totalSeats" required value={form.totalSeats} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Requirements</label>
              <input name="requirements" value={form.requirements} onChange={handleChange} className={inputClass} placeholder="Birth certificate, transfer certificate (comma-separated)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Application deadline</label>
                <input type="date" name="applicationDeadline" required value={form.applicationDeadline} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-indigo-700 text-white font-medium py-3 rounded-lg hover:bg-indigo-800 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Create circular'}
            </button>
          </form>
        )}

        {!loading && circulars.length === 0 && (
          <div className={`border rounded-xl p-8 text-center ${cardBg} ${subText}`}>No circulars yet.</div>
        )}

        <div className="space-y-3">
          {circulars.map((c) => (
            <div key={c._id} className={`border rounded-xl p-5 ${cardBg}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`font-semibold ${heading}`}>{c.title}</h2>
                <span className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[c.status]}`}>{c.status}</span>
              </div>
              <p className={`text-xs mb-3 ${subText}`}>
                Class {c.classOrGrade} · {c.totalSeats} seats · {c.applicantCount ?? 0} applicants · Deadline {new Date(c.applicationDeadline).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/admissions/applicants?circularId=${c._id}`}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'}`}
                >
                  View applicants
                </Link>
                {c.status !== 'published' && (
                  <button onClick={() => changeStatus(c._id, 'published')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                    Publish
                  </button>
                )}
                {c.status !== 'closed' && (
                  <button onClick={() => changeStatus(c._id, 'closed')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
                    Close
                  </button>
                )}
                <button onClick={() => handleDelete(c._id, c.title)} className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isDark ? 'text-red-400 hover:bg-red-950' : 'text-red-600 hover:bg-red-50'}`}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
