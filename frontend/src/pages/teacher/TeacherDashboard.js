import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DarkModeToggle, { useDarkMode } from '../../components/DarkModeToggle';

export default function TeacherDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [isDark, toggleDark] = useDarkMode();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const pageBg = isDark ? 'bg-gray-900' : 'bg-blue-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const subText = isDark ? 'text-gray-400' : 'text-gray-500';
  const btnBorder = isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-800' : 'border-blue-300 text-blue-700 hover:bg-blue-50';

  return (
    <div className={`min-h-screen ${pageBg} py-10 px-6 transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${heading}`}>Welcome, {user?.name}</h1>
            <p className={`text-sm ${subText}`}>Teacher Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle isDark={isDark} toggleDark={toggleDark} />
            <button onClick={handleLogout} className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${btnBorder}`}>
              Log out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/teacher/attendance" id="take-attendance-card" className={`border rounded-xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cardBg}`}>
            <h3 className={`font-semibold mb-1 ${heading}`}>Take Attendance</h3>
            <p className={`text-sm ${subText}`}>Mark today's attendance for one of your assigned classes - Present, Absent, or Late.</p>
          </Link>
          <Link to="/teacher/profile" className={`border rounded-xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cardBg}`}>
            <h3 className={`font-semibold mb-1 ${heading}`}>My Profile</h3>
            <p className={`text-sm ${subText}`}>View your details, update your contact info and photo, and change your password.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
