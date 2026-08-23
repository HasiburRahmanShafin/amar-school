'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface ResultRow {
  _id: string;
  studentName: string;
  status: string;
}

export default function ResultsPage() {
  const { circularId } = useParams<{ circularId: string }>();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ResultRow[] }>(`/admissions/results/${circularId}`)
      .then((res) => setResults(res.data))
      .finally(() => setLoading(false));
  }, [circularId]);

  const statusStyle = (status: string) =>
    status === 'approved'
      ? 'bg-blue-100 text-blue-700'
      : status === 'rejected'
      ? 'bg-gray-100 text-gray-500'
      : 'bg-blue-50 text-blue-400';

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Admission Results</h1>

        {loading && <p className="text-blue-600">Loading results…</p>}
        {!loading && results.length === 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-blue-500">
            Results have not been published yet.
          </div>
        )}

        <div className="bg-white border border-blue-100 rounded-xl divide-y divide-blue-50 overflow-hidden">
          {results.map((r) => (
            <div key={r._id} className="flex items-center justify-between px-6 py-4">
              <span className="text-blue-900 font-medium">{r.studentName}</span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusStyle(r.status)}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}