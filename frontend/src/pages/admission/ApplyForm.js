import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';

// NOTE: minimal placeholder standing in for Fahmida's Admission Management UI
// (see AdmissionList.js for context). Fields match the real Applicant model
// exactly so submissions actually save correctly.
const emptyForm = {
  studentName: '', dateOfBirth: '', gender: 'male',
  guardianName: '', guardianPhone: '', guardianEmail: '',
  address: '', previousSchool: '',
};

export default function ApplyForm() {
  const { circularId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await admissionApi.post('/admissions/apply', { ...form, circularId });
      navigate(`/admission/results/${circularId}`, { state: { justApplied: true } });
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-xl mx-auto bg-white border border-blue-100 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Admission Application</h1>
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Student's full name</label>
            <input name="studentName" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Date of birth</label>
              <input type="date" name="dateOfBirth" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Gender</label>
              <select name="gender" onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <hr className="border-blue-100" />
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Guardian name</label>
            <input name="guardianName" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Guardian phone</label>
              <input name="guardianPhone" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Guardian email</label>
              <input type="email" name="guardianEmail" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Address</label>
            <input name="address" required onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Previous school (optional)</label>
            <input name="previousSchool" onChange={handleChange} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
