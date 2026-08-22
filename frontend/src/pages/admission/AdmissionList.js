import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';

// NOTE: minimal placeholder standing in for Fahmida's Admission Management UI
// (this file, ApplyForm.js, and Results.js didn't exist in the repo, which was
// breaking the frontend build). Wired to the real /api/admissions endpoints so
// the app runs - please replace with the real designed page.
//
// Expects to be linked as /admission?subdomain=<school-subdomain> from a
// school's public page.
export default function AdmissionList() {
  const [searchParams] = useSearchParams();
  const subdomain = searchParams.get('subdomain');
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const query = subdomain ? `?subdomain=${encodeURIComponent(subdomain)}` : '';
    admissionApi.get(`/admissions/circulars${query}`)
      .then((res) => setCirculars(res.data))
      .catch((err) => setError(err.message || 'Failed to load admission circulars'))
      .finally(() => setLoading(false));
  }, [subdomain]);

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Admission Circulars</h1>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
        {!loading && !error && circulars.length === 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-gray-500">
            No open admissions right now.
          </div>
        )}

        <div className="space-y-4">
          {circulars.map((c) => (
            <div key={c._id} className="bg-white border border-blue-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-blue-900">{c.title}</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">Class {c.classOrGrade}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{c.description}</p>
              <p className="text-xs text-gray-500 mb-4">
                {c.totalSeats} seats · Deadline {new Date(c.applicationDeadline).toLocaleDateString()}
              </p>
              <div className="flex gap-3">
                <Link
                  to={`/admission/apply/${c._id}`}
                  className="bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800"
                >
                  Apply now
                </Link>
                <Link
                  to={`/admission/results/${c._id}`}
                  className="text-sm font-medium px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  View results
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
