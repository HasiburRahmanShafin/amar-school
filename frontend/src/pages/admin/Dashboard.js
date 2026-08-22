import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NoticesFeed from '../../components/NoticesFeed';
import RoutineFeed from '../../components/RoutineFeed';

function Dashboard() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <button onClick={logoutUser} className="text-sm text-red-600">Logout</button>
      </div>

      <div className="bg-white rounded shadow p-6 mb-6">
        <p>School: <strong>{user?.school?.name}</strong></p>
        <p>Status: <strong className="capitalize">{user?.school?.status}</strong></p>
      </div>

      <h2 className="font-semibold text-gray-600 mb-3">Modules</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/website-builder" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Website Builder</h3>
          <p className="text-sm text-gray-500">
            Logo, banner, welcome message, academic calendar, and location.
          </p>
        </Link>
        <Link to="/admin/gallery" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Photo Gallery</h3>
          <p className="text-sm text-gray-500">Manage photos of facilities, events, and activities.</p>
        </Link>
        <Link to="/admin/notices" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Notices & Events</h3>
          <p className="text-sm text-gray-500">
            Publish notices, emergency announcements, and events to the website and every dashboard.
          </p>
        </Link>
        <Link to="/admin/routines" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Class Routine</h3>
          <p className="text-sm text-gray-500">
            Publish weekly and special-day class routines to the website and every dashboard.
          </p>
        </Link>
        <div className="bg-white rounded shadow p-5 opacity-50">
          <h3 className="font-semibold mb-1">More Modules</h3>
          <p className="text-sm text-gray-500">Teacher, Student, Admissions coming in later modules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="font-semibold text-gray-600 mb-3">Recent Notices</h2>
          <div className="bg-white rounded shadow p-6">
            <NoticesFeed />
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-600 mb-3">Today's Class Routine</h2>
          <div className="bg-white rounded shadow p-6">
            <RoutineFeed />
          </div>
        </div>
        <Link to="/admin/admissions/circulars" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Admission Circulars</h3>
          <p className="text-sm text-gray-500">Create and manage admission circulars.</p>
        </Link>
        <Link to="/admin/admissions/applicants" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Applicants</h3>
          <p className="text-sm text-gray-500">Review, update status, and publish results.</p>
        </Link>
        <Link to="/admin/students" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Students</h3>
          <p className="text-sm text-gray-500">Manage student profiles, classes, and promotions.</p>
        </Link>
        <Link to="/admin/teachers" className="bg-white rounded shadow p-5 hover:shadow-md transition">
          <h3 className="font-semibold mb-1">Teachers</h3>
          <p className="text-sm text-gray-500">Manage teacher profiles, subjects, and class schedules.</p>
        </Link>
      </div>

      <h2 className="font-semibold text-gray-600 mb-3 mt-8">Recent Notices</h2>
      <div className="bg-white rounded shadow p-6">
        <NoticesFeed />
      </div>
    </div>
  );
}

export default Dashboard;
