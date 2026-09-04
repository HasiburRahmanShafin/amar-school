import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import { uploadImage } from '../../api/uploadApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle from '../../components/DarkModeToggle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const emptyForm = {
  name: '', dateOfBirth: '', gender: 'male', bloodGroup: '', address: '',
  guardianName: '', guardianPhone: '', guardianEmail: '', guardianRelation: 'Parent',
  currentClass: '', section: '', rollNumber: '', photoUrl: '',
};

const emptyLogins = {
  createStudentLogin: false,
  studentEmail: '',
  studentPassword: '',
  createParentLogin: false,
  parentEmail: '',
  parentPassword: '',
};

export default function StudentForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [logins, setLogins] = useState(emptyLogins);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { isDark, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLoginChange = (e) => {
    const { name, type, checked, value } = e.target;
    setLogins({ ...logins, [name]: type === 'checkbox' ? checked : value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (logins.createStudentLogin && (!logins.studentEmail || logins.studentPassword.length < 6)) {
      setError('Student login needs a valid email and a password of at least 6 characters.');
      setSubmitting(false);
      return;
    }
    if (logins.createParentLogin && (!logins.parentEmail || logins.parentPassword.length < 6)) {
      setError('Parent login needs a valid email and a password of at least 6 characters.');
      setSubmitting(false);
      return;
    }

    const payload = { ...form };
    if (logins.createStudentLogin) {
      payload.studentLogin = { email: logins.studentEmail, password: logins.studentPassword };
    }
    if (logins.createParentLogin) {
      payload.parentLogin = { email: logins.parentEmail, password: logins.parentPassword };
    }

    try {
      const res = await api.post('/students', payload);
      if (res.accountErrors?.length) {
        // Something about the login creation failed (e.g. duplicate email) -
        // the student profile itself WAS created, but stay on this page so
        // the admin actually sees why the login didn't happen, instead of
        // silently navigating away and losing the message.
        setError(`Student profile was created, but: ${res.accountErrors.join(' ')} You can add the missing login from the student's profile page.`);
        showToast('Student created, but a login account failed - see details above.', 'error');
        return;
      }
      showToast('Student profile created successfully!', 'success');
      navigate('/admin/students');
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Failed to create student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const heading = isDark ? 'text-white' : 'text-slate-800';
  const label = isDark ? 'text-slate-300' : 'text-indigo-900';
  const inputClass = `w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'border-indigo-200'
  }`;
  const hr = isDark ? 'border-slate-700' : 'border-indigo-100';

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton />
          <DarkModeToggle isDark={isDark} toggleDark={toggleTheme} />
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h1 className={`text-2xl font-bold mb-6 ${heading}`}>New Student Profile</h1>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-indigo-300" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-indigo-100 text-indigo-700'}`}>
                  📷
                </div>
              )}
              <label className={`text-sm font-medium px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-800' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50'
              } ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto ? 'Uploading…' : form.photoUrl ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
              </label>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Full name</label>
              <input name="name" required onChange={handleChange} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Date of birth</label>
                <input type="date" name="dateOfBirth" required onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Gender</label>
                <select name="gender" onChange={handleChange} className={inputClass}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Class</label>
                <input name="currentClass" required onChange={handleChange} className={inputClass} placeholder="6" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Section</label>
                <input name="section" required onChange={handleChange} className={inputClass} placeholder="A" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Roll no.</label>
                <input name="rollNumber" onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Address</label>
              <input name="address" required onChange={handleChange} className={inputClass} />
            </div>
            <hr className={hr} />
            <div>
              <label className={`block text-sm font-medium mb-1 ${label}`}>Guardian name</label>
              <input name="guardianName" required onChange={handleChange} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Guardian phone</label>
                <input name="guardianPhone" required onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${label}`}>Guardian email</label>
                <input type="email" name="guardianEmail" onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <hr className={hr} />
            <div>
              <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${heading}`}>Login accounts (optional)</h2>

              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${label}`}>
                <input
                  type="checkbox"
                  name="createStudentLogin"
                  checked={logins.createStudentLogin}
                  onChange={handleLoginChange}
                />
                Create a student login
              </label>
              {logins.createStudentLogin && (
                <div className="grid grid-cols-2 gap-4 mb-4 pl-6">
                  <input
                    type="email"
                    name="studentEmail"
                    placeholder="Student email"
                    required
                    value={logins.studentEmail}
                    onChange={handleLoginChange}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    name="studentPassword"
                    placeholder="Temporary password (min 6 chars)"
                    required
                    minLength={6}
                    value={logins.studentPassword}
                    onChange={handleLoginChange}
                    className={inputClass}
                  />
                </div>
              )}

              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${label}`}>
                <input
                  type="checkbox"
                  name="createParentLogin"
                  checked={logins.createParentLogin}
                  onChange={handleLoginChange}
                />
                Create a parent login
              </label>
              {logins.createParentLogin && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <input
                    type="email"
                    name="parentEmail"
                    placeholder="Parent email"
                    required
                    value={logins.parentEmail}
                    onChange={handleLoginChange}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    name="parentPassword"
                    placeholder="Temporary password (min 6 chars)"
                    required
                    minLength={6}
                    value={logins.parentPassword}
                    onChange={handleLoginChange}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="w-full bg-indigo-700 text-white font-medium py-3 rounded-lg hover:bg-indigo-800 disabled:opacity-50 transition-all duration-200 hover:shadow-md"
            >
              {submitting ? 'Saving…' : 'Create student profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
