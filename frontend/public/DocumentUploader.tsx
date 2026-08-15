import { useState } from 'react';
import * as UC from '@uploadcare/upload-client';

const uploadcare = new UC.UploadClient({ publicKey: import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY });

interface Props {
  label: string;
  onUploaded: (url: string) => void;
}

export default function DocumentUploader({ label, onUploaded }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setFileName(file.name);
    try {
      const result = await uploadcare.uploadFile(file);
      onUploaded(`https://ucarecdn.com/${result.uuid}/`);
      setStatus('done');
    } catch (err) {
      console.error('Upload failed:', err);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFile}
        className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white file:hover:bg-blue-700"
      />
      {status === 'uploading' && <span className="text-xs text-slate-500">Uploading {fileName}...</span>}
      {status === 'done' && <span className="text-xs text-blue-600">Uploaded: {fileName}</span>}
      {status === 'error' && <span className="text-xs text-rose-600">Upload failed, try again</span>}
    </div>
  );
}
