import React from 'react';

interface SaveStateBannerProps {
  status: 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
  message?: string;
}

const SaveStateBanner: React.FC<SaveStateBannerProps> = ({ status, message }) => {
  if (status === 'IDLE') return null;

  const styles = {
    SAVING: 'bg-blue-50 text-blue-700 border-blue-200',
    SAVED: 'bg-green-50 text-green-700 border-green-200',
    ERROR: 'bg-red-50 text-red-700 border-red-200',
  }[status];

  const label = {
    SAVING: 'Saving draft…',
    SAVED: 'Saved',
    ERROR: 'Save failed',
  }[status];

  return (
    <div className={`border rounded px-4 py-2 text-sm ${styles}`}>
      {label} {message && <span className="ml-2">{message}</span>}
    </div>
  );
};

export default SaveStateBanner;
