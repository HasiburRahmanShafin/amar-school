import { useEffect, useState } from 'react';
import { api } from '../../api/AdmissionApi';
import BackButton from '../../components/BackButton';
import SkeletonCard from '../../components/SkeletonCard';
import CountdownBadge from '../../components/CountdownBadge';

const emptyForm = {
  title: '', description: '', classOrGrade: '', totalSeats: 30,
  requirements: '', applicationDeadline: '', status: 'draft',
};

export default function ManageCirculars() {
  const [circulars, setCirculars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCirculars = () => {
    setLoading(true);
    api.get('/admissions/circulars').then((res) => setCirculars(res.data)).finally(() => setLoading(false));
  };
  useEffect(fetchCirculars, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admissions/circulars', {
        ...form,
        totalSeats: Number(form.totalSeats),
        requirements: form.requirements.split(',').map((r) => r.trim()).filter(Boolean),
      });
      setForm(emptyForm);
      setShowForm(false);
      fetchCirculars();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleStatus = async (c) => {
    const next = c.status === 'published' ? 'closed' : 'published';
    await api.patch(`/admissions/circulars/${c._id}`, { status: next });
    fetchCirculars();
  };

  const deleteCircular = async (id) => {
    if (!window.confirm('Delete this circular? This cannot be undone.')) return;
    await api.delete(`/admissions/circulars/${id}`);
    fetchCirculars();
  };

  const inputClass = 'w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <BackButton />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Admission Circulars</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-blue-800"
          >
            {showForm ? 'Cancel' : '+ New circular'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-blue-100 rounded-xl p-6 mb-8 space-y-4 shadow-sm">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Title</label>
              <input required className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Description</label>
              <textarea required rows={3} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Class / Grade</label>
                <input required className={inputClass} value={form.classOrGrade} onChange={(e) => setForm({ ...form, classOrGrade: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Total seats</label>
                <input type="number" required className={inputClass} value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Requirements <span className="text-gray-400 font-normal">(comma separated)</span>
              </label>
              <input className={inputClass} placeholder="Birth certificate, Previous report card" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Deadline</label>
                <input type="date" required className={inputClass} value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Status</label>
                <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <button type="submit" className="bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-800">
              Create circular
            </button>
          </form>
        )}

        {loading && (
          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        <div className="grid gap-3">
          {!loading &&
            circulars.map((c) => (
              <div key={c._id} className="bg-white border border-blue-100 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">{c.title}</h3>
                    <p className="text-sm text-gray-500">
                      {c.classOrGrade} · {c.totalSeats} seats
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
                        c.status === 'published' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.applicantCount !== undefined && (
                      <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full">
                        {c.applicantCount} applicant{c.applicantCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-50">
                  <CountdownBadge deadline={c.applicationDeadline} />
                  <div className="flex gap-3">
                    <button onClick={() => toggleStatus(c)} className="text-blue-600 text-sm font-medium hover:underline">
                      {c.status === 'published' ? 'Close' : 'Publish'}
                    </button>
                    <button onClick={() => deleteCircular(c._id)} className="text-red-500 text-sm font-medium hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
