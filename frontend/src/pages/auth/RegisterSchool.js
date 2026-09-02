import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import AuthLayout from '../../components/layout/AuthLayout';

const initialForm = {
  schoolName: '', eiin: '', address: '', phone: '', schoolEmail: '',
  subdomain: '', adminName: '', adminEmail: '', password: '',
};

const sections = [
  {
    title: 'School Information',
    icon: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    fields: [
      { name: 'schoolName',  label: 'School Name',        type: 'text',  placeholder: 'e.g. Green View High School' },
      { name: 'eiin',        label: 'EIIN Number',         type: 'text',  placeholder: 'Government EIIN' },
      { name: 'address',     label: 'Address',             type: 'text',  placeholder: 'Full school address' },
      { name: 'phone',       label: 'Phone',               type: 'text',  placeholder: '+880 17xx xxxxxx' },
      { name: 'schoolEmail', label: 'School Email',        type: 'email', placeholder: 'school@example.com' },
      { name: 'subdomain',   label: 'Preferred Subdomain', type: 'text',  placeholder: 'e.g. green-view (no spaces)' },
    ],
  },
  {
    title: 'Admin Account',
    icon: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    fields: [
      { name: 'adminName',  label: 'Full Name',      type: 'text',     placeholder: 'Admin full name' },
      { name: 'adminEmail', label: 'Admin Email',     type: 'email',    placeholder: 'admin@example.com' },
      { name: 'password',   label: 'Password',        type: 'password', placeholder: 'Minimum 6 characters' },
    ],
  },
];

export default function RegisterSchool() {
  const [form, setForm]       = useState(initialForm);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.registerSchool(form);
      setSuccess('Registration submitted! Your school is pending Super Admin approval.');
      setForm(initialForm);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Register Your School" subtitle="Fill in the details below to submit your school for approval">
      <form onSubmit={handleSubmit} id="register-school-form" className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 mt-0.5 flex-shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {success}
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                {section.icon}
              </span>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{section.title}</h2>
            </div>

            <div className="space-y-3 pl-8">
              {section.fields.map(({ name, label, type, placeholder }) => (
                <div key={name}>
                  <label htmlFor={`reg-${name}`} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {label}
                  </label>
                  <input
                    id={`reg-${name}`}
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required
                    minLength={name === 'password' ? 6 : undefined}
                    placeholder={placeholder}
                    className="input-field w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-lg px-3 py-2.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          id="register-submit-btn"
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Submitting…
            </>
          ) : 'Submit for Approval'}
        </button>

        <p className="text-sm text-center text-slate-500 dark:text-slate-400">
          Already approved?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
