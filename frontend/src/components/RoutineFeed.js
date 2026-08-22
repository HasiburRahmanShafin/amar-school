import { useEffect, useState } from 'react';
import * as routineApi from '../api/routineApi';

// JS Date.getDay() -> our dayOfWeek enum. Friday has no entry since Bangladeshi
// schools are closed that day (see ClassRoutine model).
const JS_DAY_TO_DAY_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', null, 'saturday'];

const todayKey = () => new Date().toISOString().substring(0, 10);

// Drop this into any role's dashboard (school_admin / teacher / student /
// parent) to show what's on the schedule today. Pass className/section once
// a logged-in student or parent has one on their account; until then it
// shows today's routine across every class/section, like the notices feed
// does for notices. Plain fetch-on-mount, not a live socket push - see
// /api/routines/dashboard.
function RoutineFeed({ className, section }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    routineApi
      .getDashboardRoutine(className && section ? { className, section } : undefined)
      .then((res) => setRoutines(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load routine'))
      .finally(() => setLoading(false));
  }, [className, section]);

  if (loading) return <div className="text-sm text-gray-500">Loading routine...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  const todaysDayOfWeek = JS_DAY_TO_DAY_OF_WEEK[new Date().getDay()];
  const today = todayKey();

  const todaysRoutines = routines.filter((r) =>
    r.scheduleType === 'special'
      ? r.effectiveDate.substring(0, 10) === today
      : r.dayOfWeek === todaysDayOfWeek
  );

  if (!todaysDayOfWeek) {
    return <div className="text-sm text-gray-500">No classes today - enjoy the weekend!</div>;
  }

  if (todaysRoutines.length === 0) {
    return <div className="text-sm text-gray-500">No routine published for today yet.</div>;
  }

  return (
    <div className="space-y-4">
      {todaysRoutines.map((routine) => (
        <div key={routine._id}>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-medium">
              {routine.className} - Section {routine.section}
            </p>
            {routine.scheduleType === 'special' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                {routine.label || 'Special schedule'}
              </span>
            )}
          </div>
          <ul className="space-y-1">
            {routine.periods.map((period, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-3">
                <span className="text-gray-400 w-24 shrink-0">
                  {period.startTime} - {period.endTime}
                </span>
                <span>
                  {period.subject} <span className="text-gray-400">({period.teacherName})</span>
                  {period.classroom ? ` - Room ${period.classroom}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default RoutineFeed;
