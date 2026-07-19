import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
      <Link to="/login" className="text-blue-600">Back to Login</Link>
    </div>
  );
}

export default NotFound;
