import { useNavigate } from 'react-router-dom';

// Small "go back" link used at the top of admin pages. Falls back to the
// dashboard if there's no page to go back to (e.g. opened via a direct link).
export default function BackButton({ to, isDark }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) return navigate(to);
    if (window.history.length > 2) return navigate(-1);
    navigate('/admin/dashboard');
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1 text-sm font-medium transition-colors duration-200 ${
        isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-700'
      }`}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
