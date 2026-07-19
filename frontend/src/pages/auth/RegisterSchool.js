import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';

const initialForm = {
  schoolName: '',
  eiin: '',
  address: '',
  phone: '',
  schoolEmail: '',
  subdomain: '',
  adminName: '',
  adminEmail: '',
  password: '',
};

const fields = [
  ['schoolName', 'School Name'],
  ['eiin', 'EIIN Number'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['schoolEmail', 'School Email'],
  ['subdomain', 'Preferred Subdomain (e.g. green-view)'],
  ['adminName', 'Admin Full Name'],
  ['adminEmail', 'Admin Email'],
];

function RegisterSchool() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.registerSchool(form);
      setSuccess('Registration submitted! Your school is pending Super Admin approval.');
      setForm(initialForm);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Register Your School</h1>

        {error && <p className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">{error}</p>}
        {success && <p className="bg-green-100 text-green-700 text-sm p-2 rounded mb-4">{success}</p>}

        {fields.map(([name, label]) => (
          <div key={name} className="mb-4">
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              type="text"
              name={name}
              value={form[name]}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        ))}

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </button>

        <p className="text-sm text-center mt-4">
          Already approved? <Link to="/login" className="text-blue-600">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterSchool;
