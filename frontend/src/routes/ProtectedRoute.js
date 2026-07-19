import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any page in this to require login, and optionally restrict by role:
// <ProtectedRoute allowedRoles={['school_admin']}><Dashboard /></ProtectedRoute>
function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
