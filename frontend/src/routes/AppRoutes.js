import { Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import RegisterSchool from '../pages/auth/RegisterSchool';
import VerifySchools from '../pages/superadmin/VerifySchools';
import Dashboard from '../pages/admin/Dashboard';
import WebsiteBuilder from '../pages/admin/WebsiteBuilder';
import GalleryManager from '../pages/admin/GalleryManager';
import NoticeManager from '../pages/admin/NoticeManager';
import RoutineManager from '../pages/admin/RoutineManager';
import SchoolWebsite from '../pages/public/SchoolWebsite';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

import AdmissionList from '../pages/admission/AdmissionList';
import ApplyForm from '../pages/admission/ApplyForm';
import Results from '../pages/admission/Results';
import ManageCirculars from '../pages/admin/ManageCirculars';
import ManageApplicants from '../pages/admin/ManageApplicants';
import StudentList from '../pages/admin/StudentList';
import StudentForm from '../pages/admin/StudentForm';
import PromoteStudents from '../pages/admin/PromoteStudents';
import TeacherList from '../pages/admin/TeacherList';
import TeacherForm from '../pages/admin/TeacherForm';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import MyProfile from '../pages/teacher/MyProfile';
import TakeAttendance from '../pages/teacher/TakeAttendance';
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentAttendanceHistory from '../pages/student/AttendanceHistory';
import FeePayment from '../pages/student/FeePayment';
import SchoolProfile from '../pages/admin/SchoolProfile';
import ProfileChangeRequests from '../pages/superadmin/ProfileChangeRequests';
import AdminFeeManager from '../pages/admin/AdminFeeManager';
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-school" element={<RegisterSchool />} />
      <Route path="/school/:subdomain" element={<SchoolWebsite />} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentList /></ProtectedRoute>} />
      <Route path="/admin/students/new" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentForm /></ProtectedRoute>} />
      <Route path="/admin/students/:id/edit" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentForm /></ProtectedRoute>} />
      <Route path="/admin/students/promote" element={<ProtectedRoute allowedRoles={['school_admin']}><PromoteStudents /></ProtectedRoute>} />

      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['school_admin']}><TeacherList /></ProtectedRoute>} />
      <Route path="/admin/teachers/new" element={<ProtectedRoute allowedRoles={['school_admin']}><TeacherForm /></ProtectedRoute>} />
      <Route path="/admin/teachers/:id/edit" element={<ProtectedRoute allowedRoles={['school_admin']}><TeacherForm /></ProtectedRoute>} />

      <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><MyProfile /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TakeAttendance /></ProtectedRoute>} />

      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><StudentAttendanceHistory /></ProtectedRoute>} />
      <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><FeePayment /></ProtectedRoute>} />

      <Route path="/admin/school-profile" element={<ProtectedRoute allowedRoles={['school_admin']}><SchoolProfile /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['school_admin']}><AdminFeeManager /></ProtectedRoute>} />
      <Route path="/superadmin/profile-changes" element={<ProtectedRoute allowedRoles={['super_admin']}><ProfileChangeRequests /></ProtectedRoute>} />

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

      <Route path="/" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
