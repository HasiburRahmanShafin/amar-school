import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <button onClick={logoutUser} className="text-sm text-red-600">Logout</button>
      </div>
      <div className="bg-white rounded shadow p-6">
        <p>School: <strong>{user?.school?.name}</strong></p>
        <p>Status: <strong className="capitalize">{user?.school?.status}</strong></p>
        <p className="text-gray-500 mt-4">
          This is the base admin dashboard. Module 1 features (Website Builder, Profile,
          Notices, Admissions) plug in here.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
