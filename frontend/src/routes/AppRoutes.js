import { Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import RegisterSchool from '../pages/auth/RegisterSchool';
import VerifySchools from '../pages/superadmin/VerifySchools';
import ProfileChangeRequests from '../pages/superadmin/ProfileChangeRequests';
import Dashboard from '../pages/admin/Dashboard';
import SchoolProfile from '../pages/admin/SchoolProfile';
import WebsiteBuilder from '../pages/admin/WebsiteBuilder';
import GalleryManager from '../pages/admin/GalleryManager';
import NoticeManager from '../pages/admin/NoticeManager';
import SchoolWebsite from '../pages/public/SchoolWebsite';
import TakeAttendance from '../pages/teacher/TakeAttendance';
import MyAttendance from '../pages/student/MyAttendance';
import ChildAttendance from '../pages/parent/ChildAttendance';
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
        path="/superadmin/profile-changes"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ProfileChangeRequests />
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
        path="/admin/school-profile"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <SchoolProfile />
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
        path="/teacher/attendance"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TakeAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/attendance"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/parent/attendance"
        element={
          <ProtectedRoute allowedRoles={['parent']}>
            <ChildAttendance />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
