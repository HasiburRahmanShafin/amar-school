import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import { uploadImage } from '../../api/uploadApi';
import BackButton from '../../components/BackButton';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';
import { useToast } from '../../components/Toast';

const emptyForm = {
  name: '', dateOfBirth: '', gender: 'male', bloodGroup: '', address: '',
  guardianName: '', guardianPhone: '', guardianEmail: '', guardianRelation: 'Parent',
  currentClass: '', section: '', rollNumber: '', photoUrl: '',
};

export default function StudentForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDark, toggleDark] = useDarkMode();
  const { showToast } = useToast();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/students', form);
      showToast('Student profile created successfully!', 'success');
      navigate('/admin/students');
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Failed to create student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const label = isDark ? 'text-gray-300' : 'text-blue-900';
  const inputClass = `w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-blue-200'
  }`;
  const hr = isDark ? 'border-gray-700' : 'border-blue-100';

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <BackButton />
          <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
        </div>

        <div className={`border rounded-xl shadow-sm p-8 ${cardBg}`}>
          <h1 className={`text-2xl font-bold mb-6 ${heading}`}>New Student Profile</h1>
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
            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="w-full bg-blue-700 text-white font-medium py-3 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-all duration-200 hover:shadow-md"
            >
              {submitting ? 'Saving…' : 'Create student profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
