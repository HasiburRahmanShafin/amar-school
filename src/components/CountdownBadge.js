export default function CountdownBadge({ deadline }) {
  const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return <span className="text-xs font-medium text-gray-400">Deadline passed</span>;
  }
  if (days === 0) {
    return <span className="text-xs font-medium text-red-600">Last day to apply!</span>;
  }
  if (days <= 3) {
    return <span className="text-xs font-medium text-red-500">{days} day{days > 1 ? 's' : ''} left</span>;
  }
  if (days <= 7) {
    return <span className="text-xs font-medium text-amber-600">{days} days left</span>;
  }
  return <span className="text-xs text-gray-500">{days} days left</span>;
}
