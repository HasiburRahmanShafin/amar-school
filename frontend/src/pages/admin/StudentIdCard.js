import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/StudentApi';
import BackButton from '../../components/BackButton';

export default function StudentIdCard() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/students/${id}/id-card`).then((res) => setStudent(res.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-blue-600">Loading…</div>;
  if (!student) return <div className="min-h-screen bg-blue-50 flex items-center justify-center text-red-500">Not found.</div>;

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6 flex flex-col items-center">
      <div className="max-w-sm w-full mb-6">
        <BackButton />
      </div>

      {/* ID Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100 print:shadow-none">
        <div className="bg-blue-700 px-5 py-4 text-white text-center">
          <p className="text-xs tracking-widest uppercase text-blue-200">Student Identity Card</p>
          <p className="text-lg font-bold mt-0.5"> </p>
        </div>

        <div className="p-5 flex gap-4">
          <div className="w-20 h-24 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-300 text-3xl font-bold">{student.name?.[0]}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-blue-900 text-base leading-tight">{student.name}</p>
            <p className="text-xs text-gray-500 mt-1">ID: {student.studentId}</p>
            <p className="text-xs text-gray-500">Class {student.currentClass} - {student.section}</p>
            {student.rollNumber && <p className="text-xs text-gray-500">Roll: {student.rollNumber}</p>}
            <p className="text-xs text-gray-500">DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-blue-100 px-5 py-3 flex items-center justify-between bg-blue-50/50">
          <span className="text-[10px] text-gray-400">Valid for current academic year</span>
          <span className="text-[10px] font-mono text-blue-400">{student._id?.slice(-8).toUpperCase()}</span>
        </div>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-800 print:hidden"
      >
        Print ID card
      </button>
    </div>
  );
}