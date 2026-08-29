import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';
 
export default function Login() {
  const [loginMode, setLoginMode] = useState('staff'); // 'staff' | 'student'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { loginUser }           = useAuth();
  const navigate                = useNavigate();
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(email, password);
 
      if (loginMode === 'student') {
        if (user.role === 'student' || user.role === 'parent') {
          navigate('/student/dashboard');
        } else {
          setError('This login is for student and parent accounts. Please switch to "School Staff" above.');
        }
        return;
      }
 
      // staff mode
      if (user.role === 'super_admin')  navigate('/superadmin/schools');
      else if (user.role === 'school_admin') navigate('/admin/dashboard');
      else if (user.role === 'teacher')      navigate('/teacher/dashboard');
      else if (user.role === 'student' || user.role === 'parent') {
        setError('This account is a student/parent account. Please switch to "Student & Parent" above.');
      } else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };
 
  const isStudentMode = loginMode === 'student';
 
  return (
    <AuthLayout
      title={isStudentMode ? 'Student & Parent Login' : 'Welcome back'}
      subtitle={isStudentMode ? 'Access your personalized dashboard' : 'Sign in to your school dashboard'}
    >
      {/* Role toggle */}
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 mb-6">
        <button
          type="button"
          onClick={() => { setLoginMode('staff'); setError(''); }}
          className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
            loginMode === 'staff'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          School Staff
        </button>
        <button
          type="button"
          onClick={() => { setLoginMode('student'); setError(''); }}
          className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
            loginMode === 'student'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Student & Parent
        </button>
      </div>
 
      <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
 
        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isStudentMode ? 'parent@example.com' : 'admin@yourschool.edu'}
              className="input-field w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </div>
        </div>
 
        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="input-field w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl pl-10 pr-10 py-3 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw
                ? <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>
 
        {/* Submit */}
        <button
          id="login-submit-btn"
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
              Signing in…
            </>
          ) : 'Sign In'}
        </button>
 
        {isStudentMode ? (
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            Don't have login details yet? Please contact your school's administration office.
          </p>
        ) : (
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            New school?{' '}
            <Link to="/register-school" className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Register here
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
 
