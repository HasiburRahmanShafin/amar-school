import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as noticeApi from '../../api/noticeApi';
import AdminLayout from '../../components/layout/AdminLayout';

const emptyForm = {
  title: '',
  description: '',
  category: 'notice',
  startDate: '',
  endDate: '',
  attachmentUrl: '',
  attachmentName: '',
};

const CATEGORY_OPTIONS = [
  { value: 'notice', label: 'General Notice' },
  { value: 'emergency', label: 'Emergency Announcement' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'exam_timetable', label: 'Examination Timetable' },
  { value: 'event', label: 'Event' },
];

function NoticeManager() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const loadNotices = () => {
    setLoading(true);
    noticeApi
      .getMyNotices()
      .then((res) => setNotices(res.data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load notices' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const { attachmentUrl, attachmentName } = await noticeApi.uploadNoticeAttachment(file);
      setForm((prev) => ({ ...prev, attachmentUrl, attachmentName }));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Attachment upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (notice) => {
    setEditingId(notice._id);
    setForm({
      title: notice.title,
      description: notice.description,
      category: notice.category,
      // Mongo returns full ISO dates - trim to YYYY-MM-DD for <input type="date">
      startDate: notice.startDate ? notice.startDate.substring(0, 10) : '',
      endDate: notice.endDate ? notice.endDate.substring(0, 10) : '',
      attachmentUrl: notice.attachmentUrl || '',
      attachmentName: notice.attachmentName || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice? This also removes it from the academic calendar.')) return;
    try {
      await noticeApi.deleteNotice(id);
      setNotices((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete notice' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        const res = await noticeApi.updateNotice(editingId, form);
        setNotices((prev) => prev.map((n) => (n._id === editingId ? res.data : n)));
        setMessage({ type: 'success', text: 'Notice updated' });
      } else {
        const res = await noticeApi.createNotice(form);
        setNotices((prev) => [res.data, ...prev]);
        setMessage({ type: 'success', text: 'Notice published to the website and all dashboards' });
      }
      resetForm();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save notice' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notice & Event Management</h1>
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
        <h2 className="font-semibold">{editingId ? 'Edit Notice' : 'Publish a New Notice'}</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={handleChange('title')}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Eid Vacation Notice"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={handleChange('description')}
            className="w-full border rounded px-3 py-2"
            placeholder="Details students, teachers, and parents should know"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={form.category}
              onChange={handleChange('category')}
              className="w-full border rounded px-3 py-2"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={handleChange('startDate')}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={handleChange('endDate')}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attachment (optional)</label>
          <input type="file" onChange={handleAttachmentUpload} accept="image/*,.pdf,.doc,.docx" />
          {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
          {form.attachmentUrl && !uploading && (
            <p className="text-xs text-green-600 mt-1">Attached: {form.attachmentName}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update Notice' : 'Publish Notice'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded border">
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="font-semibold text-gray-600 mb-3">Published Notices</h2>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : notices.length === 0 ? (
        <div className="text-sm text-gray-500">No notices published yet.</div>
      ) : (
        <div className="bg-white rounded shadow divide-y">
          {notices.map((notice) => (
            <div key={notice._id} className="p-4 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
                    {notice.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(notice.startDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="font-medium">{notice.title}</p>
                <p className="text-sm text-gray-500">{notice.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(notice)} className="text-sm text-blue-600">
                  Edit
                </button>
                <button onClick={() => handleDelete(notice._id)} className="text-sm text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default NoticeManager;
