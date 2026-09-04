import { useState } from 'react';
import { api } from '../../api/StudentApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function PromoteStudents() {
  const [form, setForm] = useState({ fromClass: '', toClass: '', fromSection: '', toSection: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isDark, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/students/promote', form);
      setResult(res.promotedCount);
      showToast(`${res.promotedCount} student(s) promoted!`, 'success');
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Promotion failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-indigo-500';
  const label = isDark ? 'text-slate-300' : 'text-indigo-900';
  const inputClass = `w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-indigo-200'
  }`;

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton />
          <DarkModeToggle isDark={isDark} toggleDark={toggleTheme} />
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h1 className={`text-xl font-bold mb-1 ${heading}`}>Promote Students</h1>
          <p className={`text-sm mb-6 ${subText}`}>Move every active student from one class to the next, in one click.</p>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
          {result !== null && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-4 ${isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
              {result} student{result === 1 ? '' : 's'} promoted successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>From class</label>
                <input required className={inputClass} onChange={(e) => setForm({ ...form, fromClass: e.target.value })} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>To class</label>
                <input required className={inputClass} onChange={(e) => setForm({ ...form, toClass: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>From section (optional)</label>
                <input className={inputClass} onChange={(e) => setForm({ ...form, fromSection: e.target.value })} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>To section (optional)</label>
                <input className={inputClass} onChange={(e) => setForm({ ...form, toSection: e.target.value })} />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-700 text-white font-medium py-3 rounded-lg hover:bg-indigo-800 disabled:opacity-50 transition-all duration-200 hover:shadow-md"
            >
              {submitting ? 'Promoting…' : 'Promote all students'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
