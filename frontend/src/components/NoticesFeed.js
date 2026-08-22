import { useEffect, useState } from 'react';
import * as noticeApi from '../api/noticeApi';

const CATEGORY_STYLES = {
  emergency: 'bg-red-100 text-red-700',
  holiday: 'bg-green-100 text-green-700',
  exam_timetable: 'bg-purple-100 text-purple-700',
  event: 'bg-blue-100 text-blue-700',
  notice: 'bg-gray-100 text-gray-700',
};

const CATEGORY_LABELS = {
  emergency: 'Emergency',
  holiday: 'Holiday',
  exam_timetable: 'Exam Timetable',
  event: 'Event',
  notice: 'Notice',
};

// Drop this into any role's dashboard (school_admin / teacher / student /
// parent) to show the shared notice feed. It's a plain fetch-on-mount list
// rather than a live socket push - see /api/notices/dashboard.
function NoticesFeed() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    noticeApi
      .getDashboardNotices()
      .then((res) => setNotices(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load notices'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading notices...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (notices.length === 0) return <div className="text-sm text-gray-500">No notices yet.</div>;

  return (
    <ul className="space-y-3">
      {notices.map((notice) => (
        <li key={notice._id} className="border-b border-gray-100 pb-3 last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                CATEGORY_STYLES[notice.category] || CATEGORY_STYLES.notice
              }`}
            >
              {CATEGORY_LABELS[notice.category] || 'Notice'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(notice.startDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {notice.endDate && notice.endDate !== notice.startDate
                ? ` - ${new Date(notice.endDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : ''}
            </span>
          </div>
          <p className="font-medium">{notice.title}</p>
          <p className="text-sm text-gray-600">{notice.description}</p>
          {notice.attachmentUrl && (
            <a
              href={notice.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              download={notice.attachmentName || true}
              className="text-xs text-blue-600 underline"
            >
              {notice.attachmentName || 'View attachment'}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default NoticesFeed;
