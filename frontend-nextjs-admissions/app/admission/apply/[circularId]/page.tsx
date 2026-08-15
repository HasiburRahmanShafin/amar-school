'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ApplyPage() {
  const { circularId } = useParams<{ circularId: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    studentName: '',
    dateOfBirth: '',
    gender: 'male',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    address: '',
    previousSchool: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/admissions/apply', { ...form, circularId, documents: [] });
      router.push('/admissions/applied');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-xl mx-auto bg-white border border-blue-100 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">Admission Application</h1>
        <p className="text-blue-500 text-sm mb-6">Fill in the student and guardian details below.</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Student name</label>
            <input name="studentName" required onChange={handleChange} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Date of birth</label>
              <input type="date" name="dateOfBirth" required onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Gender</label>
              <select name="gender" onChange={handleChange} className={inputClass}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Guardian name</label>
            <input name="guardianName" required onChange={handleChange} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Guardian phone</label>
              <input name="guardianPhone" required onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Guardian email</label>
              <input type="email" name="guardianEmail" required onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Address</label>
            <input name="address" required onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Previous school <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input name="previousSchool" onChange={handleChange} className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}