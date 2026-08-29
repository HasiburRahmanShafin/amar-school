import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';

// NOTE: minimal placeholder standing in for Fahmida's Admission Management UI
// (see AdmissionList.js for context).
export default function Results() {
  const { circularId } = useParams();
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    admissionApi.get(`/admissions/results/${circularId}`)
      .then((res) => setResults(res.data))
      .catch((err) => setError(err.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [circularId]);

  const statusColors = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    reviewed: 'bg-amber-100 text-amber-700',
    pending: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Admission Results</h1>

        {location.state?.justApplied && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
            Your application was submitted! Results will appear here once published.
          </div>
        )}

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
        {!loading && !error && results.length === 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-gray-500">
            Results haven't been published yet for this circular.
          </div>
        )}

        <div className="bg-white border border-blue-100 rounded-xl overflow-hidden divide-y divide-blue-50">
          {results.map((r) => (
            <div key={r._id} className="flex items-center justify-between px-5 py-4">
              <span className="font-medium text-blue-900">{r.studentName}</span>
              <span className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[r.status] || statusColors.pending}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
