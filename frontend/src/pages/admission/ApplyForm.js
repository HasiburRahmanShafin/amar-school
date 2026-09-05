import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admissionApi } from '../../api/admissionApi';
import uploadToUploadcare from '../../utils/uploadToUploadcare';

const emptyForm = {
  studentName: '', dateOfBirth: '', gender: 'male',
  guardianName: '', guardianPhone: '', guardianEmail: '',
  address: '', previousSchool: '',
};

export default function ApplyForm() {
  const { circularId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({ photo: null, birthCertificate: null, reportCard: null });
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [error, setError] = useState('');

  // circular.classOrGrade holds a value like "Class 1" (matches AdmissionCircular model)
  const [circularClass, setCircularClass] = useState('');
  const [circularLoading, setCircularLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    admissionApi
      .get(`/admissions/circulars/${circularId}`)
      .then((res) => {
        if (!isMounted) return;
        setCircularClass(res.data?.data?.classOrGrade || res.data?.classOrGrade || '');
      })
      .catch((err) => {
        console.error('Failed to load circular details:', err);
      })
      .finally(() => {
        if (isMounted) setCircularLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [circularId]);

  const isClassOne = circularClass === 'Class 1';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) => {
    setFiles((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!files.photo || !files.birthCertificate) {
        throw new Error('Applicant photo and birth certificate are required.');
      }
      if (!isClassOne && !files.reportCard) {
        throw new Error('Previous year report card is required (not required for Class 1).');
      }

      setUploadStage('Uploading photo…');
      const photoUrl = await uploadToUploadcare(files.photo);
      if (!photoUrl) throw new Error('Photo upload returned no URL — check console for details.');
      console.log('photoUrl:', photoUrl);

      setUploadStage('Uploading birth certificate…');
      const birthCertificateUrl = await uploadToUploadcare(files.birthCertificate);
      if (!birthCertificateUrl) throw new Error('Birth certificate upload returned no URL — check console for details.');
      console.log('birthCertificateUrl:', birthCertificateUrl);

      setUploadStage('Uploading report card…');
      const reportCardUrl = files.reportCard ? await uploadToUploadcare(files.reportCard) : undefined;
      console.log('reportCardUrl:', reportCardUrl);

      setUploadStage('Submitting application…');

      const payload = {
        ...form,
        circularId,
        photoUrl,
        birthCertificateUrl,
        reportCardUrl,
      };
      console.log('Final payload being sent:', payload);

      await admissionApi.post('/admissions/apply', payload);

      navigate(`/admission/results/${circularId}`, { state: { justApplied: true } });
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
      setUploadStage('');
    }
  };

  const inputClass = 'w-full border border-blue-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const fileInputClass = 'w-full border border-blue-200 rounded-lg px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm hover:file:bg-blue-100';

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-xl mx-auto bg-white border border-blue-100 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Admission Application</h1>
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Student's full name</label>
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
          <hr className="border-blue-100" />
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
            <label className="block text-sm font-medium text-blue-900 mb-1">Previous school (optional)</label>
            <input name="previousSchool" onChange={handleChange} className={inputClass} />
          </div>

          <hr className="border-blue-100" />
          <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Required Documents</h2>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Applicant photo</label>
            <input type="file" name="photo" accept="image/*" required onChange={handleFileChange} className={fileInputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Birth certificate</label>
            <input type="file" name="birthCertificate" accept="image/*,.pdf" required onChange={handleFileChange} className={fileInputClass} />
          </div>
          {!circularLoading && !isClassOne && (
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">
                Previous year report card
              </label>
              <input type="file" name="reportCard" accept="image/*,.pdf" required onChange={handleFileChange} className={fileInputClass} />
            </div>
          )}
          {!circularLoading && isClassOne && (
            <p className="text-sm text-gray-400">Report card not required for Class 1 applicants.</p>
          )}

          <button
            type="submit"
            disabled={submitting || circularLoading}
            className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? (uploadStage || 'Submitting…') : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
