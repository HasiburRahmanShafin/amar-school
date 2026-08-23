'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdmissionCircular } from '@/types/admission';

export default function AdmissionsPage() {
  const [circulars, setCirculars] = useState<AdmissionCircular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ data: AdmissionCircular[] }>('/admissions/circulars')
      .then((res) => setCirculars(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-blue-700 text-white py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">Admission Circulars</h1>
          <p className="text-blue-100 mt-2">Open applications for the upcoming academic year.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {loading && <p className="text-blue-600">Loading circulars…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && circulars.length === 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-blue-500">
            No admission circulars are open right now.
          </div>
        )}

        <div className="grid gap-4">
          {circulars.map((c) => (
            <div
              key={c._id}
              className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-blue-900">{c.title}</h2>
                  <p className="text-blue-600 text-sm mt-1">Class: {c.classOrGrade}</p>
                  <p className="text-gray-600 mt-3 line-clamp-2">{c.description}</p>
                </div>
                <span className="shrink-0 bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                  {c.totalSeats} seats
                </span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-50">
                <p className="text-sm text-gray-500">
                  Deadline: {new Date(c.applicationDeadline).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/admission/results/${c._id}`}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    View results
                  </Link>
                  <Link
                    href={`/admission/apply/${c._id}`}
                    className="bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Apply now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}