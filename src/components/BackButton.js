import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 text-sm font-medium mb-4"
    >
      ← Back
    </button>
  );
}
