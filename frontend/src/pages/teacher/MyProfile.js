import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/TeacherApi';
import { uploadImage } from '../../api/uploadApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { useToast } from '../../components/Toast';

export default function MyProfile() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [isDark, toggleDark] = useDarkMode();
  const { showToast } = useToast();

  useEffect(() => {
    teacherApi.get('/teachers/me')
      .then((res) => {
        setTeacher(res.data);
        setPhone(res.data.phone || '');
        setPhotoUrl(res.data.photoUrl || '');
      })
      .catch((err) => {
        setNotFound(true);
        showToast?.(err.message || 'Failed to load profile', 'error');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Please select an image file.', 'error');
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(file);
      setPhotoUrl(url);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Photo upload failed', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await teacherApi.patch('/teachers/me', { phone, photoUrl });
      setTeacher(res.data);
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setSavingPw(true);
    try {
      await teacherApi.patch('/teachers/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast('Password changed', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPw(false);
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

  if (loading) {
    return (
      <div className={`min-h-screen ${pageBg} py-10 px-6 flex items-center justify-center ${subText}`}>
        Loading your profile…
      </div>
    );
  }

  if (notFound || !teacher) {
    return (
      <div className={`min-h-screen ${pageBg} py-10 px-6`}>
        <div className="max-w-xl mx-auto">
          <BackButton isDark={isDark} />
          <p className={`mt-6 text-center ${subText}`}>
            No teacher profile is linked to your account yet. Contact your school administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton isDark={isDark} to="/teacher/dashboard" />
          <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h1 className={`text-2xl font-bold mb-1 ${heading}`}>{teacher.name}</h1>
          <p className={`text-sm mb-6 ${subText}`}>{teacher.teacherId} · {teacher.department}</p>

          <dl className="grid grid-cols-2 gap-y-3 text-sm mb-6">
            <dt className={subText}>Email</dt>
            <dd className={heading}>{teacher.email}</dd>
            <dt className={subText}>Date of joining</dt>
            <dd className={heading}>{new Date(teacher.dateOfJoining).toLocaleDateString()}</dd>
            <dt className={subText}>Qualifications</dt>
            <dd className={heading}>{teacher.qualifications?.join(', ') || '—'}</dd>
            <dt className={subText}>Subjects</dt>
            <dd className={heading}>{teacher.subjects?.join(', ')}</dd>
            <dt className={subText}>Status</dt>
            <dd className={`${heading} capitalize`}>{teacher.status?.replace('_', ' ')}</dd>
          </dl>

          {teacher.assignedClasses?.length > 0 && (
            <div className="mb-6">
              <p className={`text-sm font-medium mb-2 ${label}`}>Class schedule</p>
              <div className="space-y-1">
                {teacher.assignedClasses.map((c, i) => (
                  <p key={i} className={`text-sm ${subText}`}>
                    Class {c.class}-{c.section} · {c.subject}
                  </p>
                ))}
              </div>
            </div>
          )}

          <p className={`text-xs mb-6 ${subText}`}>
            Only your phone number and photo can be edited here — everything else is managed by your school administrator.
          </p>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-blue-300" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-blue-100 text-blue-700'}`}>
                  📷
                </div>
              )}
              <label className={`text-sm font-medium px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50'
              } ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto ? 'Uploading…' : 'Change photo'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
              </label>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>

            <button
              type="submit"
              disabled={savingProfile || uploadingPhoto}
              className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h2 className={`text-lg font-bold mb-4 ${heading}`}>Change password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Current password</label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Confirm new password</label>
              <input
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
