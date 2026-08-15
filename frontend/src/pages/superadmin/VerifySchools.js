import { useEffect, useState } from 'react';
import * as authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

function VerifySchools() {
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const { logoutUser } = useAuth();

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">School Registrations</h1>
        <button onClick={logoutUser} className="text-sm text-red-600">Logout</button>
      </div>

      <div className="mb-4 flex gap-2">
        {['pending', 'active', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : schools.length === 0 ? (
        <p className="text-gray-500">No {filter} schools.</p>
      ) : (
        <div className="bg-white rounded shadow divide-y">
          {schools.map((school) => (
            <div key={school._id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{school.name}</p>
                <p className="text-sm text-gray-500">
                  EIIN: {school.eiin} - {school.subdomain}.amarschool.com
                </p>
                <p className="text-sm text-gray-500">{school.address}</p>
              </div>
              {school.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(school._id)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(school._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VerifySchools;
