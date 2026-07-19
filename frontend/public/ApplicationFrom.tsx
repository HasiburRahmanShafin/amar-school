import { useState } from 'react';
import { Circular, DocumentUpload, submitApplication } from '../../api/admission';
import DocumentUploader from './DocumentUploader';

interface Props {
  circular: Circular;
}
export default function ApplicationForm({ circular }: Props) {
  const [form, setForm] = useState({
    studentName: '',
    dateOfBirth: '',
    gender: '',
    previousSchool: '',
    previousClass: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianRelation: '',
  });
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addDocument(name: string, url: string) {
    setDocuments((prev) => [...prev.filter((d) => d.name !== name), { name, url }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (documents.length < circular.requiredDocuments.length) {
      setError('Please upload all required documents before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication({ circularId: circular.id, ...form, documents });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong submitting your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-blue-800">
        <h3 className="text-lg font-semibold">Application submitted!</h3>
        <p className="mt-1 text-sm">
          We've emailed a confirmation to {form.guardianEmail}. You'll be notified once results are published.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6 p-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{circular.title}</h2>
        <p className="text-sm text-slate-600">{circular.eligibilityCriteria}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-700">Student Information</legend>
        <input required placeholder="Student full name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.studentName} onChange={(e) => update('studentName', e.target.value)} />
        <input required type="date"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
        <select required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.gender} onChange={(e) => update('gender', e.target.value)}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input placeholder="Previous school (optional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.previousSchool} onChange={(e) => update('previousSchool', e.target.value)} />
        <input placeholder="Previous class (optional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.previousClass} onChange={(e) => update('previousClass', e.target.value)} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-700">Guardian Information</legend>
        <input required placeholder="Guardian name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.guardianName} onChange={(e) => update('guardianName', e.target.value)} />
        <input required placeholder="Relation to student"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.guardianRelation} onChange={(e) => update('guardianRelation', e.target.value)} />
        <input required type="tel" placeholder="Phone number"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.guardianPhone} onChange={(e) => update('guardianPhone', e.target.value)} />
        <input required type="email" placeholder="Email address"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={form.guardianEmail} onChange={(e) => update('guardianEmail', e.target.value)} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-700">Required Documents</legend>
        {circular.requiredDocuments.map((docName) => (
          <DocumentUploader key={docName} label={docName} onUploaded={(url) => addDocument(docName, url)} />
        ))}
      </fieldset>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}
