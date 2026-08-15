import { useEffect, useState } from 'react';
import { fetchApplications, reviewApplication, publishResults } from '../../api/admission';

interface Application {
  id: string;
  studentName: string;
  guardianName: string;
  guardianEmail: string;
  status: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'ADMITTED';
  documents: { name: string; url: string }[];
}

interface Props {
  circularId: string;
  token: string;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
  SHORTLISTED: 'bg-sky-50 text-sky-700 border-sky-200',
  ADMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function ApplicationQueue({ circularId, token }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForAdmission, setSelectedForAdmission] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const data = await fetchApplications(circularId, token);
    setApplications(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [circularId]);

  async function handleDecision(id: string, decision: 'SHORTLISTED' | 'REJECTED') {
    await reviewApplication(id, decision, token);
    load();
  }

  function toggleAdmit(id: string) {
    setSelectedForAdmission((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handlePublishResults() {
    if (selectedForAdmission.size === 0) return;
    const confirmed = window.confirm(
      `Publish results? ${selectedForAdmission.size} student(s) will be admitted, everyone else rejected.`
    );
    if (!confirmed) return;

    const result = await publishResults(circularId, Array.from(selectedForAdmission), token);
    alert(`Done — ${result.admitted} admitted, ${result.rejected} rejected.`);
    load();
  }

  if (loading) return <p className="p-4 text-sm text-slate-500">Loading applications…</p>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Admission Review Queue</h2>
        <button
          onClick={handlePublishResults}
          disabled={selectedForAdmission.size === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Publish Results ({selectedForAdmission.size} selected)
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-2.5">Student</th>
              <th className="px-4 py-2.5">Guardian</th>
              <th className="px-4 py-2.5">Documents</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Actions</th>
              <th className="px-4 py-2.5">Admit</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{app.studentName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {app.guardianName}
                  <div className="text-xs text-slate-400">{app.guardianEmail}</div>
                </td>
                <td className="px-4 py-3">
                  {app.documents.map((d) => (
                    <a key={d.name} href={d.url} target="_blank" rel="noreferrer"
                      className="mr-2 text-blue-600 underline hover:text-blue-700">{d.name}</a>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[app.status]}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-3">
                  {app.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleDecision(app.id, 'SHORTLISTED')}
                        className="text-xs font-medium text-sky-600 hover:underline">Shortlist</button>
                      <button onClick={() => handleDecision(app.id, 'REJECTED')}
                        className="text-xs font-medium text-rose-600 hover:underline">Reject</button>
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  {app.status === 'SHORTLISTED' && (
                    <input
                      type="checkbox"
                      checked={selectedForAdmission.has(app.id)}
                      onChange={() => toggleAdmit(app.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
