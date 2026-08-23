import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

const FIELD_LABELS = {
  name: 'School name',
  eiin: 'EIIN',
  principalName: "Principal's name",
  address: 'Address',
};

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  return String(value);
}

function ProfileChangeRequests() {
  const [changes, setChanges] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const { logoutUser } = useAuth();

  const loadChanges = async (status) => {
    setLoading(true);
    try {
      const res = await authApi.getProfileChanges(status);
      setChanges(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChanges(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await authApi.approveProfileChange(id);
      loadChanges(filter);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection?');
    if (reason === null) return;
    setActingId(id);
    try {
      await authApi.rejectProfileChange(id, reason || 'Not specified');
      loadChanges(filter);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">School Profile Change Requests</h1>
          <p className="text-sm text-gray-500">
            Sensitive fields (school name, EIIN, principal's name, address) require your approval before
            they go live on a school's profile.
          </p>
          <Link to="/superadmin/schools" className="text-sm text-blue-600 underline">
            &larr; School Registrations
          </Link>
        </div>
        <button onClick={logoutUser} className="text-sm text-red-600">Logout</button>
      </div>

      <div className="mb-4 flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
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
      ) : changes.length === 0 ? (
        <p className="text-gray-500">No {filter} change requests.</p>
      ) : (
        <div className="bg-white rounded shadow divide-y">
          {changes.map((change) => (
            <div key={change._id} className="p-4 flex justify-between items-start gap-4">
              <div>
                <p className="font-semibold">
                  {change.school?.name || 'Unknown school'}{' '}
                  <span className="text-xs text-gray-400 font-normal">({change.school?.subdomain})</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{FIELD_LABELS[change.field] || change.field}:</strong>{' '}
                  <span className="line-through text-gray-400">{formatValue(change.oldValue)}</span>{' '}
                  &rarr; <span className="font-medium">{formatValue(change.newValue)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Requested by {change.changedBy?.name || 'Unknown'} ({change.changedByRole || 'unknown role'}) on{' '}
                  {new Date(change.createdAt).toLocaleString()}
                </p>
                {change.status !== 'pending' && change.reviewNote && (
                  <p className="text-xs text-gray-400 mt-1">Note: {change.reviewNote}</p>
                )}
              </div>
              {change.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(change._id)}
                    disabled={actingId === change._id}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(change._id)}
                    disabled={actingId === change._id}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
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

export default ProfileChangeRequests;
