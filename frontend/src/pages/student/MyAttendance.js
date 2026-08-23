import AttendanceHistory from './AttendanceHistory';

// Route wrapper for the /student/attendance page - the AttendanceHistory
// component reads the logged-in student's own id from AuthContext.
function MyAttendance() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">My Attendance</h1>
      <AttendanceHistory />
    </div>
  );
}

export default MyAttendance;
