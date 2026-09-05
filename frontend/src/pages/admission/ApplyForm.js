import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileUploaderRegular } from '@uploadcare/react-uploader';
import '@uploadcare/react-uploader/core.css';
import { admissionApi } from '../../api/admissionApi';

const UPLOADCARE_PUBLIC_KEY = process.env.REACT_APP_UPLOADCARE_PUBLIC_KEY;

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

  const [circular, setCircular] = useState(null);
  const [birthCertUrl, setBirthCertUrl] = useState('');
  const [reportCardUrl, setReportCardUrl] = useState('');
  const [otherDocs, setOtherDocs] = useState([]);

  useEffect(() => {
    admissionApi.get(`/admissions/circulars/${circularId}`)
      .then((res) => setCircular(res.data))
      .catch(() => setCircular(null));
  }, [circularId]);

  const isClassOne = /class\s*1\b|^1$/i.test(circular?.classOrGrade || '');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOtherDocSuccess = (fileInfo) => {
    if (!fileInfo?.cdnUrl) return;
    setOtherDocs((prev) => [...prev, { label: fileInfo.name || 'Supporting Document', url: fileInfo.cdnUrl }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!birthCertUrl) {
      setError("Please upload the student's birth certificate.");
      return;
    }
    if (!isClassOne && !reportCardUrl) {
      setError("Please upload the previous year's report card (required for classes above Class 1).");
      return;
    }

    const documents = [
      { label: 'Birth Certificate', url: birthCertUrl },
      ...(reportCardUrl ? [{ label: 'Previous Report Card', url: reportCardUrl }] : []),
      ...otherDocs,
    ];

    setSubmitting(true);
    try {
      await admissionApi.post('/admissions/apply', { ...form, circularId, documents });
      navigate(`/admission/results/${circularId}`, { state: { justApplied: true } });
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400';
  const labelClass = 'block text-sm font-medium text-blue-950 mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-blue-50 py-10 px-6">
      <div className="max-w-xl mx-auto">
        {/* Header card */}
        <div className="bg-white border border-blue-100 rounded-2xl shadow-sm px-8 pt-8 pb-6 mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-2xl mx-auto mb-3 shadow-md shadow-blue-600/20">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-blue-950">Admission Application</h1>
          {circular?.title ? (
            <p className="text-sm text-blue-500 mt-1.5">
              Applying for <strong>{circular.title}</strong>{circular.classOrGrade ? ` · ${circular.classOrGrade}` : ''}
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-1.5">Fill in your details below to apply.</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section: Student details */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>👤</span> Student details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Student's full name</label>
                <input name="studentName" required onChange={handleChange} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date of birth</label>
                  <input type="date" name="dateOfBirth" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select name="gender" onChange={handleChange} className={inputClass}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Guardian details */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>👪</span> Guardian details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Guardian name</label>
                <input name="guardianName" required onChange={handleChange} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Guardian phone</label>
                  <input name="guardianPhone" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Guardian email</label>
                  <input type="email" name="guardianEmail" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input name="address" required onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  Previous school <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input name="previousSchool" onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Section: Documents */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>📎</span> Required documents
            </h2>
            <p className="text-xs text-slate-400 mb-4">Clear scans or photos are fine — PDF, JPG, or PNG.</p>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>
                  Birth Certificate <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl border border-dashed border-blue-200 p-1 bg-blue-50/40">
                  <FileUploaderRegular
                    pubkey={UPLOADCARE_PUBLIC_KEY}
                    multiple={false}
                    imgOnly={false}
                    sourceList="local, camera"
                    classNameUploader="uc-light"
                    onFileUploadSuccess={(info) => setBirthCertUrl(info.cdnUrl)}
                    onFileRemoved={() => setBirthCertUrl('')}
                  />
                </div>
                {birthCertUrl && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <span>✓</span> Uploaded successfully
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Previous Year's Report Card{' '}
                  {isClassOne ? (
                    <span className="text-slate-400 text-xs font-normal">(optional for Class 1)</span>
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <div className="rounded-xl border border-dashed border-blue-200 p-1 bg-blue-50/40">
                  <FileUploaderRegular
                    pubkey={UPLOADCARE_PUBLIC_KEY}
                    multiple={false}
                    imgOnly={false}
                    sourceList="local, camera"
                    classNameUploader="uc-light"
                    onFileUploadSuccess={(info) => setReportCardUrl(info.cdnUrl)}
                    onFileRemoved={() => setReportCardUrl('')}
                  />
                </div>
                {reportCardUrl && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <span>✓</span> Uploaded successfully
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Other supporting documents <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <div className="rounded-xl border border-dashed border-blue-200 p-1 bg-blue-50/40">
                  <FileUploaderRegular
                    pubkey={UPLOADCARE_PUBLIC_KEY}
                    multiple={true}
                    imgOnly={false}
                    sourceList="local, camera"
                    classNameUploader="uc-light"
                    onFileUploadSuccess={handleOtherDocSuccess}
                  />
                </div>
                {otherDocs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {otherDocs.map((d, i) => (
                      <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ {d.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-800 disabled:opacity-50 shadow-lg shadow-blue-700/25 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting…
              </>
            ) : (
              <>Submit application</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
