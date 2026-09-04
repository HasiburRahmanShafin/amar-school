import { useEffect, useState } from 'react';
import * as authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';

function VerifySchools() {
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const { isDark } = useAuth();

  const card = isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80';
  const label = isDark ? 'text-slate-400' : 'text-slate-500';

  const loadSchools = async (status) => {
    setLoading(true);
    try {
      const res = await authApi.getPendingSchools(status);
      setSchools(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (id) => {
    await authApi.approveSchool(id);
    loadSchools(filter);
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection?');
    await authApi.rejectSchool(id, reason || 'Not specified');
    loadSchools(filter);
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>School Registrations</h1>
          <p className={`text-sm mt-1 ${label}`}>Review and approve schools that have applied to join the platform.</p>
        </div>

        <div className="flex gap-2">
          {['pending', 'active', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                filter === s ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading && <p className={label}>Loading…</p>}
        {!loading && schools.length === 0 && <p className={label}>No {filter} schools.</p>}

        <div className="space-y-3">
          {schools.map((school) => (
            <div key={school._id} className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{school.name}</p>
                  <p className={`text-xs mt-1 ${label}`}>
                    EIIN: {school.eiin} · {school.subdomain}.amarschool.com
                  </p>
                  <p className={`text-xs mt-1 ${label}`}>{school.address}</p>
                </div>
                {school.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(school._id)}
                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(school._id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

export default VerifySchools;
