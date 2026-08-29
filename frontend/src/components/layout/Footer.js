import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { isDark } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer
      className={`text-center text-xs py-4 border-t transition-colors duration-300
        ${isDark
          ? 'border-slate-700/60 text-slate-500 bg-slate-900'
          : 'border-slate-200/80 text-slate-400 bg-white'}`}
    >
      <span>
        © {year}{' '}
        <span className="font-semibold" style={{ color: '#6366f1' }}>Amar School</span>
        {' '}— Empowering Education with Technology
      </span>
    </footer>
  );
}
