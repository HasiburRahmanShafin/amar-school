import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherApi } from '../../api/TeacherApi';
import { uploadImage } from '../../api/uploadApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { useToast } from '../../components/Toast';

const emptyForm = {
  name: '', email: '', phone: '', photoUrl: '',
  department: '', dateOfJoining: '', qualifications: '', subjects: '',
  status: 'active',
};

const emptyClassRow = { class: '', section: '', subject: '' };

// yyyy-mm-dd, the format <input type="date"> needs
const toDateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function TeacherForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [userId, setUserId] = useState(null);
  const [issuedCredentials, setIssuedCredentials] = useState(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDark, toggleDark] = useDarkMode();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isEdit) return;
    teacherApi.get(`/teachers/${id}`)
      .then((res) => {
        const t = res.data;
        setForm({
          name: t.name || '',
          email: t.email || '',
          phone: t.phone || '',
          photoUrl: t.photoUrl || '',
          department: t.department || '',
          dateOfJoining: toDateInputValue(t.dateOfJoining),
          qualifications: (t.qualifications || []).join(', '),
          subjects: (t.subjects || []).join(', '),
          status: t.status || 'active',
        });
        setAssignedClasses(t.assignedClasses?.length ? t.assignedClasses : []);
        setUserId(t.userId || null);
      })
      .catch((err) => showToast?.(err.message || 'Failed to load teacher', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError('');
    setUploadingPhoto(true);
    try {
      const imageUrl = await uploadImage(file);
      setForm((prev) => ({ ...prev, photoUrl: imageUrl }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateClassRow = (index, field, value) => {
    setAssignedClasses((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addClassRow = () => setAssignedClasses((rows) => [...rows, { ...emptyClassRow }]);
  const removeClassRow = (index) => setAssignedClasses((rows) => rows.filter((_, i) => i !== index));

  const handleCreateAccount = async () => {
    setAccountBusy(true);
    try {
      const res = await teacherApi.post(`/teachers/${id}/account`, {});
      setUserId(true); // account now exists; exact User id isn't needed client-side
      setIssuedCredentials(res.data);
      showToast('Login account created', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create login account', 'error');
    } finally {
      setAccountBusy(false);
    }
  };

  const handleRevokeAccount = async () => {
    if (!window.confirm("Revoke this teacher's login access? They will no longer be able to sign in.")) return;
    setAccountBusy(true);
    try {
      await teacherApi.delete(`/teachers/${id}/account`);
      setUserId(null);
      setIssuedCredentials(null);
      showToast('Login access revoked', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to revoke login access', 'error');
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      photoUrl: form.photoUrl,
      department: form.department,
      dateOfJoining: form.dateOfJoining,
      qualifications: form.qualifications.split(',').map((s) => s.trim()).filter(Boolean),
      subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
      assignedClasses: assignedClasses.filter((r) => r.class && r.section && r.subject),
      status: form.status,
    };

    try {
      if (isEdit) {
        await teacherApi.patch(`/teachers/${id}`, payload);
        showToast('Teacher profile updated!', 'success');
      } else {
        await teacherApi.post('/teachers', payload);
        showToast('Teacher profile created!', 'success');
      }
      navigate('/admin/teachers');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save teacher';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const label = isDark ? 'text-gray-300' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = `w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-blue-200'
  }`;
  const hr = isDark ? 'border-gray-700' : 'border-blue-100';

  if (loading) {
    return (
      <div className={`min-h-screen ${pageBg} py-10 px-6 flex items-center justify-center ${subText}`}>
        Loading teacher profile…
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton isDark={isDark} />
          <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h1 className={`text-2xl font-bold mb-6 ${heading}`}>
            {isEdit ? 'Edit Teacher Profile' : 'New Teacher Profile'}
          </h1>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-blue-300" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                  📷
                </div>
              )}
              <label className={`text-sm font-medium px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
              } ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto ? 'Uploading…' : form.photoUrl ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
              </label>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Full name</label>
              <input name="name" required value={form.name} onChange={handleChange} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Email</label>
                <input type="email" name="email" required value={form.email} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Phone</label>
                <input name="phone" required value={form.phone} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Department</label>
                <input name="department" required value={form.department} onChange={handleChange} className={inputClass} placeholder="Science" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Date of joining</label>
                <input type="date" name="dateOfJoining" required value={form.dateOfJoining} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Qualifications</label>
              <input
                name="qualifications"
                value={form.qualifications}
                onChange={handleChange}
                className={inputClass}
                placeholder="BSc in Physics, MEd (comma-separated)"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Subjects taught</label>
              <input
                name="subjects"
                required
                value={form.subjects}
                onChange={handleChange}
                className={inputClass}
                placeholder="Physics, Higher Math (comma-separated)"
              />
            </div>

            {isEdit && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <hr className={hr} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${label}`}>Class schedule</label>
                <button
                  type="button"
                  onClick={addClassRow}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  + Add class
                </button>
              </div>
              <p className={`text-xs mb-3 ${subText}`}>
                Each row links this teacher to a class, section, and subject — used automatically by attendance and result management.
              </p>

              {assignedClasses.length === 0 && (
                <p className={`text-sm italic ${subText}`}>No classes assigned yet.</p>
              )}

              <div className="space-y-2">
                {assignedClasses.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input
                      value={row.class}
                      onChange={(e) => updateClassRow(i, 'class', e.target.value)}
                      className={inputClass}
                      placeholder="Class (6)"
                    />
                    <input
                      value={row.section}
                      onChange={(e) => updateClassRow(i, 'section', e.target.value)}
                      className={inputClass}
                      placeholder="Section (A)"
                    />
                    <input
                      value={row.subject}
                      onChange={(e) => updateClassRow(i, 'subject', e.target.value)}
                      className={inputClass}
                      placeholder="Subject"
                    />
                    <button
                      type="button"
                      onClick={() => removeClassRow(i)}
                      className={`text-sm px-2 py-2 rounded-lg transition-colors ${
                        isDark ? 'text-red-400 hover:bg-red-950' : 'text-red-600 hover:bg-red-50'
                      }`}
                      aria-label="Remove class"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {isEdit && (
              <>
                <hr className={hr} />
                <div>
                  <label className={`block text-sm font-medium mb-2 ${label}`}>Login access</label>

                  {issuedCredentials && (
                    <div className={`rounded-lg p-4 mb-3 text-sm ${isDark ? 'bg-green-950 text-green-300' : 'bg-green-50 text-green-800'}`}>
                      <p className="font-medium mb-1">Share these with the teacher — shown only once:</p>
                      <p>Email: <span className="font-mono">{issuedCredentials.email}</span></p>
                      <p>Temporary password: <span className="font-mono">{issuedCredentials.tempPassword}</span></p>
                    </div>
                  )}

                  {userId ? (
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${subText}`}>✅ This teacher can log in and edit their own profile.</p>
                      <button
                        type="button"
                        onClick={handleRevokeAccount}
                        disabled={accountBusy}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 ${isDark ? 'text-red-400 hover:bg-red-950' : 'text-red-600 hover:bg-red-50'}`}
                      >
                        Revoke access
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${subText}`}>No login account yet.</p>
                      <button
                        type="button"
                        onClick={handleCreateAccount}
                        disabled={accountBusy}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border disabled:opacity-50 ${
                          isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {accountBusy ? 'Creating…' : 'Create login'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-all duration-200 hover:shadow-md"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create teacher profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
