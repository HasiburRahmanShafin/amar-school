import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api/StudentApi';

export default function EnrollmentChart({ isDark }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/enrollment-count')
      .then((res) => {
        console.log('Enrollment API response:', res);
        const formatted = (res.data || []).map((item) => ({
          label: `${item._id.class}${item._id.section ? '-' + item._id.section : ''}`,
          count: item.count,
        }));
        setData(formatted);
      })
      .catch((err) => {
        console.error('Enrollment fetch failed:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-100';
  const heading = isDark ? 'text-gray-100' : 'text-blue-900';
  const gridColor = isDark ? '#374151' : '#dbeafe';
  const axisColor = isDark ? '#9ca3af' : '#64748b';

  if (loading) {
    return (
      <div className={`border rounded-xl p-6 mb-6 animate-pulse ${cardBg}`}>
        <div className={`h-4 w-40 rounded mb-4 ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`} />
        <div className={`h-40 rounded ${isDark ? 'bg-gray-700' : 'bg-blue-100'}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border rounded-xl p-4 mb-6 text-sm text-red-600 bg-red-50 border-red-200`}>
        Chart failed to load: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`border rounded-xl p-4 mb-6 text-sm ${cardBg} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        No enrollment data yet.
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-6 mb-6 ${cardBg}`}>
      <h3 className={`text-sm font-semibold mb-4 ${heading}`}>Enrollment by class</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} />
          <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#dbeafe'}`,
              borderRadius: '8px',
              fontSize: '13px',
            }}
            labelStyle={{ color: isDark ? '#f3f4f6' : '#1e3a8a' }}
          />
          <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
