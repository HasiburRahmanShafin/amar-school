import { Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import RegisterSchool from '../pages/auth/RegisterSchool';
import VerifySchools from '../pages/superadmin/VerifySchools';
import Dashboard from '../pages/admin/Dashboard';
import WebsiteBuilder from '../pages/admin/WebsiteBuilder';
import GalleryManager from '../pages/admin/GalleryManager';
import NoticeManager from '../pages/admin/NoticeManager';
import RoutineManager from '../pages/admin/RoutineManager';
import FinancialReports from '../pages/admin/FinancialReports';
import SchoolWebsite from '../pages/public/SchoolWebsite';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-school" element={<RegisterSchool />} />

      {/* Public school website - stand-in for subdomain routing during local dev.
          In production this same page is what schoolname.amarschool.com resolves to. */}
      <Route path="/school/:subdomain" element={<SchoolWebsite />} />

      <Route
        path="/superadmin/schools"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <VerifySchools />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/website-builder"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <WebsiteBuilder />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gallery"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <GalleryManager />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notices"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <NoticeManager />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/routines"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <RoutineManager />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/financial-reports"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <FinancialReports />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
