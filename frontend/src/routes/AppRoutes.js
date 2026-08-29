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
import StudentList from '../pages/admin/StudentList';
import StudentForm from '../pages/admin/StudentForm';
import PromoteStudents from '../pages/admin/PromoteStudents';
import TeacherList from '../pages/admin/TeacherList';
import TeacherForm from '../pages/admin/TeacherForm';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import MyProfile from '../pages/teacher/MyProfile';
import StudentProfile from '../pages/admin/StudentProfile';
import StudentIdCard from '../pages/admin/StudentIdCard';
import ChildProfile from '../pages/parent/ChildProfile';
import StudentDashboard from '../pages/student/StudentDashboard';
import AnalyticsDashboard from '../pages/admin/AnalyticsDashboard';
import CreateParentAccount from '../pages/admin/CreateParentAccount';
import StudentExamRoutine from '../pages/student/StudentExamRoutine';
 import ExamManager from '../pages/admin/ExamManager';
import RoutineManager from '../pages/admin/RoutineManager';
import AttendanceCollection from '../pages/admin/AttendanceCollection';
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
      <Route path="/admin/students/:id" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentProfile /></ProtectedRoute>} />
      <Route path="/admin/students/:id/id-card" element={<ProtectedRoute allowedRoles={['school_admin']}><StudentIdCard /></ProtectedRoute>} />

      <Route path="/parent/child-profile" element={<ProtectedRoute allowedRoles={['parent']}><ChildProfile /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['school_admin']}><ExamManager /></ProtectedRoute>} />
      <Route path="/admin/routines" element={<ProtectedRoute allowedRoles={['school_admin']}><RoutineManager /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['school_admin']}><AttendanceCollection /></ProtectedRoute>} />

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
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['parent','student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exam-routine"
        element={
          <ProtectedRoute allowedRoles={['parent','student']}>
            <StudentExamRoutine />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/parent-accounts"
        element={
          <ProtectedRoute allowedRoles={['school_admin']}>
            <CreateParentAccount />
          </ProtectedRoute>
        }
      />
 
      <Route path="/" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
 
export default AppRoutes;
