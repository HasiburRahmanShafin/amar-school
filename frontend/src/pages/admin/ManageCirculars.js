import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { useToast } from '../../components/Toast';

const emptyForm = {
  title: '', description: '', classOrGrade: '', totalSeats: '',
  requirements: '', applicationDeadline: '', status: 'draft',
};

function daysLeft(dateStr) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default function ManageCirculars() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [isDark, toggleDark] = useDarkMode();
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

  const stats = useMemo(() => {
    const published = circulars.filter((c) => c.status === 'published').length;
    const totalApplicants = circulars.reduce((sum, c) => sum + (c.applicantCount ?? 0), 0);
    const totalSeats = circulars.reduce((sum, c) => sum + (Number(c.totalSeats) || 0), 0);
    return { total: circulars.length, published, totalApplicants, totalSeats };
  }, [circulars]);

  const pageBg = isDark ? 'bg-gray-950' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100/80 shadow-sm';
  const heading = isDark ? 'text-gray-100' : 'text-blue-950';
  const label = isDark ? 'text-gray-300' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-slate-500';
  const inputClass = `w-full border rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-blue-200'
  }`;
  const statusStyles = {
    draft: isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-slate-100 text-slate-600 border-slate-200',
    published: isDark ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: isDark ? 'bg-red-950/50 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* Gradient header banner */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 px-6 pt-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <BackButton isDark className="text-blue-100 hover:text-white" />
            <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Admissions</p>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
                <span>🎓</span> Admission Circulars
              </h1>
              <p className="text-blue-100/90 text-sm mt-1.5 max-w-md">
                Publish new intake circulars and track how applications flow in.
              </p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="bg-white text-blue-700 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-blue-50 shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 self-start"
            >
              <span>{showForm ? '✕' : '➕'}</span>
              {showForm ? 'Cancel' : 'New circular'}
            </button>
          </div>
        </div>
      </div>

      {/* Content, pulled up over the banner */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 pb-12">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total circulars', value: stats.total, icon: '📋' },
            { label: 'Live now', value: stats.published, icon: '🟢' },
            { label: 'Total applicants', value: stats.totalApplicants, icon: '🙋' },
            { label: 'Total seats', value: stats.totalSeats, icon: '💺' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 ${cardBg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className={`text-2xl font-extrabold ${heading}`}>{s.value}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${subText}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleSubmit} className={`border rounded-2xl p-6 mb-6 space-y-4 animate-fade-up ${cardBg}`}>
            <h2 className={`font-semibold text-sm uppercase tracking-wide ${label}`}>New circular details</h2>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Title</label>
              <input name="title" required value={form.title} onChange={handleChange} className={inputClass} placeholder="e.g. Class 6 Admission 2027" />
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
            <button type="submit" disabled={submitting} className="w-full bg-blue-700 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-700/20 transition-all">
              {submitting ? 'Saving…' : 'Create circular'}
            </button>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <p className={`text-sm ${subText}`}>Loading circulars…</p>
          </div>
        ) : circulars.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <div className="text-4xl mb-3">📭</div>
            <h3 className={`text-base font-bold ${heading}`}>No circulars yet</h3>
            <p className={`text-xs mt-1 ${subText}`}>Create your first admission circular to start accepting applications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {circulars.map((c) => {
              const remaining = daysLeft(c.applicationDeadline);
              const seatFill = c.totalSeats ? Math.min(100, Math.round(((c.applicantCount ?? 0) / c.totalSeats) * 100)) : 0;
              return (
                <div key={c._id} className={`rounded-2xl border p-5 transition-all hover:shadow-md ${cardBg}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${statusStyles[c.status]}`}>
                        📋
                      </div>
                      <div>
                        <h2 className={`font-bold text-base ${heading}`}>{c.title}</h2>
                        <p className={`text-xs mt-0.5 ${subText}`}>
                          Class {c.classOrGrade} · {c.totalSeats} seats
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize flex-shrink-0 ${statusStyles[c.status]}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs mb-3 pl-[52px]">
                    <span className={subText}>
                      🙋 <strong className={heading}>{c.applicantCount ?? 0}</strong> applicant{(c.applicantCount ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <span className={subText}>
                      📅 Deadline {new Date(c.applicationDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {c.status === 'published' && (
                      <span className={remaining >= 0 ? (remaining <= 3 ? 'text-amber-600 dark:text-amber-400 font-medium' : subText) : 'text-red-500 font-medium'}>
                        {remaining >= 0 ? `⏳ ${remaining} day${remaining !== 1 ? 's' : ''} left` : '⌛ Deadline passed'}
                      </span>
                    )}
                  </div>

                  {/* Seat-fill progress bar */}
                  {c.totalSeats > 0 && (
                    <div className="mb-4 pl-[52px]">
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-blue-100'}`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${seatFill}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/admissions/applicants?circularId=${c._id}`}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                        isDark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      👥 View applicants
                    </Link>
                    {c.status !== 'published' && (
                      <button onClick={() => changeStatus(c._id, 'published')} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                        Publish
                      </button>
                    )}
                    {c.status !== 'closed' && (
                      <button onClick={() => changeStatus(c._id, 'closed')} className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                        Close
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c._id, c.title)}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-950/50' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
