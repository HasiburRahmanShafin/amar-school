import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AttendanceHistory from '../student/AttendanceHistory';

// Parents may have more than one child linked to their account
// (user.parentInfo.children, populated with name/class/section by
// GET /api/auth/me) - this page lets them switch between them.
function ChildAttendance() {
  const { user } = useAuth();
  const children = user?.parentInfo?.children || [];
  const [selectedId, setSelectedId] = useState(children[0]?._id || '');

  const selectedChild = children.find((c) => c._id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Child Attendance</h1>

      {children.length === 0 ? (
        <p className="text-sm text-gray-500">No children are linked to your account yet.</p>
      ) : (
        <>
          {children.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Child</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="border rounded px-3 py-2"
              >
                {children.map((child) => (
                  <option key={child._id} value={child._id}>
                    {child.name}
                    {child.studentInfo?.className ? ` (Class ${child.studentInfo.className} - ${child.studentInfo.section})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <AttendanceHistory studentId={selectedId} studentName={selectedChild?.name} />
        </>
      )}
    </div>
  );
}

export default ChildAttendance;
