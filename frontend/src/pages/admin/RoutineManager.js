import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as routineApi from '../../api/routineApi';
import AdminLayout from '../../components/layout/AdminLayout';

export const DAY_OPTIONS = [
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
];

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));

const emptyPeriod = () => ({
  periodNumber: 1,
  subject: '',
  teacherName: '',
  startTime: '',
  endTime: '',
  classroom: '',
});

const emptyForm = {
  className: '',
  section: '',
  scheduleType: 'regular',
  dayOfWeek: 'saturday',
  effectiveDate: '',
  label: '',
  periods: [emptyPeriod()],
};

function RoutineManager() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadRoutines = () => {
    setLoading(true);
    routineApi
      .getMyRoutines()
      .then((res) => setRoutines(res.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load routines' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePeriodChange = (index, field) => (e) => {
    const value = field === 'periodNumber' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({
      ...prev,
      periods: prev.periods.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const addPeriod = () => {
    setForm((prev) => ({
      ...prev,
      periods: [...prev.periods, { ...emptyPeriod(), periodNumber: prev.periods.length + 1 }],
    }));
  };

  const removePeriod = (index) => {
    setForm((prev) => ({
      ...prev,
      periods: prev.periods.filter((_, i) => i !== index).map((p, i) => ({ ...p, periodNumber: i + 1 })),
    }));
  };

  const handleEdit = (routine) => {
    setEditingId(routine._id);
    setForm({
      className: routine.className,
      section: routine.section,
      scheduleType: routine.scheduleType,
      dayOfWeek: routine.dayOfWeek || 'saturday',
      effectiveDate: routine.effectiveDate ? routine.effectiveDate.substring(0, 10) : '',
      label: routine.label || '',
      periods: routine.periods.map((p) => ({ ...p })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this routine? Students and parents will no longer see it.')) return;
    try {
      await routineApi.deleteRoutine(id);
      setRoutines((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete routine' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        const res = await routineApi.updateRoutine(editingId, { label: form.label, periods: form.periods });
        setRoutines((prev) => prev.map((r) => (r._id === editingId ? res.data : r)));
        setMessage({ type: 'success', text: 'Routine updated and everyone notified' });
      } else {
        const res = await routineApi.publishRoutine(form);
        setRoutines((prev) => {
          const withoutReplaced = prev.filter((r) => r._id !== res.data._id);
          return [res.data, ...withoutReplaced];
        });
        setMessage({ type: 'success', text: 'Routine published to the website and all dashboards' });
      }
      resetForm();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save routine' });
    } finally {
      setSaving(false);
    }
  };

  // Group published routines by class + section for a readable list
  const grouped = routines.reduce((acc, routine) => {
    const key = `${routine.className}||${routine.section}`;
    acc[key] = acc[key] || [];
    acc[key].push(routine);
    return acc;
  }, {});

  const dayOrder = DAY_OPTIONS.map((d) => d.value);
  Object.values(grouped).forEach((list) =>
    list.sort((a, b) => {
      if (a.scheduleType !== b.scheduleType) return a.scheduleType === 'regular' ? -1 : 1;
      if (a.scheduleType === 'regular') return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      return new Date(a.effectiveDate) - new Date(b.effectiveDate);
    })
  );

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Class Routine Management</h1>
        <Link to="/admin/dashboard" className="text-sm text-blue-600">
          &larr; Back to Dashboard
        </Link>
      </div>

      {message && (
        <div
          className={`mb-6 p-3 rounded text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 mb-8 space-y-4">
        <h2 className="font-semibold">{editingId ? 'Edit Routine' : 'Publish a Routine'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <input
              type="text"
              required
              disabled={!!editingId}
              value={form.className}
              onChange={handleChange('className')}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="e.g. Class 8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Section</label>
            <input
              type="text"
              required
              disabled={!!editingId}
              value={form.section}
              onChange={handleChange('section')}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="e.g. A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Schedule Type</label>
            <select
              disabled={!!editingId}
              value={form.scheduleType}
              onChange={handleChange('scheduleType')}
              className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="regular">Regular (weekly)</option>
              <option value="special">Special (one date)</option>
            </select>
          </div>
          {form.scheduleType === 'regular' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Day</label>
              <select
                disabled={!!editingId}
                value={form.dayOfWeek}
                onChange={handleChange('dayOfWeek')}
                className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                required
                disabled={!!editingId}
                value={form.effectiveDate}
                onChange={handleChange('effectiveDate')}
                className="w-full border rounded px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          )}
        </div>

        {editingId && (
          <p className="text-xs text-gray-400">
            Class, section, schedule type and day/date can't be changed once published - delete and
            republish instead if the slot itself is wrong.
          </p>
        )}

        {form.scheduleType === 'special' && (
          <div>
            <label className="block text-sm font-medium mb-1">Label (optional)</label>
            <input
              type="text"
              value={form.label}
              onChange={handleChange('label')}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. Ramadan Routine, Exam Day Schedule"
            />
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium">Periods</label>
            <button type="button" onClick={addPeriod} className="text-sm text-blue-600">
              + Add period
            </button>
          </div>

          {form.periods.map((period, index) => (
            <div key={index} className="border rounded p-3 mb-2">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="w-16">
                  <label className="block text-xs font-medium mb-1">#</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={period.periodNumber}
                    onChange={handlePeriodChange(index, 'periodNumber')}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={period.subject}
                    onChange={handlePeriodChange(index, 'subject')}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium mb-1">Teacher</label>
                  <input
                    type="text"
                    required
                    value={period.teacherName}
                    onChange={handlePeriodChange(index, 'teacherName')}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="e.g. Mr. Karim"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium mb-1">Start</label>
                  <input
                    type="time"
                    required
                    value={period.startTime}
                    onChange={handlePeriodChange(index, 'startTime')}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium mb-1">End</label>
                  <input
                    type="time"
                    required
                    value={period.endTime}
                    onChange={handlePeriodChange(index, 'endTime')}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium mb-1">Room</label>
                  <input
                    type="text"
                    value={period.classroom}
                    onChange={handlePeriodChange(index, 'classroom')}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="204"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePeriod(index)}
                  disabled={form.periods.length === 1}
                  className="text-red-600 text-sm px-2 disabled:opacity-30"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update Routine' : 'Publish Routine'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded border">
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="font-semibold text-gray-600 mb-3">Published Routines</h2>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-sm text-gray-500">No routines published yet.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, list]) => {
            const [className, section] = key.split('||');
            return (
              <div key={key} className="bg-white rounded shadow overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-2 font-semibold text-sm">
                  {className} - Section {section}
                </div>
                <div className="divide-y">
                  {list.map((routine) => (
                    <div key={routine._id} className="p-4">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {routine.scheduleType === 'regular'
                              ? DAY_LABELS[routine.dayOfWeek]
                              : new Date(routine.effectiveDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                          </span>
                          {routine.label && <span className="text-xs text-gray-500 ml-2">{routine.label}</span>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleEdit(routine)} className="text-sm text-blue-600">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(routine._id)} className="text-sm text-red-600">
                            Delete
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400">
                            <th className="pr-3 py-1 font-normal">#</th>
                            <th className="pr-3 py-1 font-normal">Subject</th>
                            <th className="pr-3 py-1 font-normal">Teacher</th>
                            <th className="pr-3 py-1 font-normal">Time</th>
                            <th className="pr-3 py-1 font-normal">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routine.periods.map((period, i) => (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="pr-3 py-1">{period.periodNumber}</td>
                              <td className="pr-3 py-1">{period.subject}</td>
                              <td className="pr-3 py-1">{period.teacherName}</td>
                              <td className="pr-3 py-1">
                                {period.startTime} - {period.endTime}
                              </td>
                              <td className="pr-3 py-1">{period.classroom || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

export default RoutineManager;
