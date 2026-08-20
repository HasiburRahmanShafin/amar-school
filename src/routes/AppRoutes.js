import { Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import RegisterSchool from '../pages/auth/RegisterSchool';
import VerifySchools from '../pages/superadmin/VerifySchools';
import Dashboard from '../pages/admin/Dashboard';
import WebsiteBuilder from '../pages/admin/WebsiteBuilder';
import GalleryManager from '../pages/admin/GalleryManager';
import NoticeManager from '../pages/admin/NoticeManager';
import SchoolWebsite from '../pages/public/SchoolWebsite';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

import AdmissionList from '../pages/admission/AdmissionList';
import ApplyForm from '../pages/admission/ApplyForm';
import Results from '../pages/admission/Results';
import ManageCirculars from '../pages/admin/ManageCirculars';
import ManageApplicants from '../pages/admin/ManageApplicants';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-school" element={<RegisterSchool />} />
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

      <Route path="/admission" element={<AdmissionList />} />
      <Route path="/admission/apply/:circularId" element={<ApplyForm />} />
      <Route path="/admission/results/:circularId" element={<Results />} />
      <Route
        path="/admin/admissions/circulars"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <ManageCirculars />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/admissions/applicants"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <ManageApplicants />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
