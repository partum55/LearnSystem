import React, { useState } from 'react';
import { Button } from '../components/Button';

const CalendarPage: React.FC = () => {
  const [studentGroupId, setStudentGroupId] = useState('123'); // Example student group ID

  const handleSubscribe = () => {
    const url = `/api/calendar/student/${studentGroupId}/subscribe`;
    // In a real app, you would probably want to show a modal with this URL
    // for the user to copy and paste into their calendar app.
    alert(`Subscription URL: ${window.location.origin}${url}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendar Integration</h1>
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={studentGroupId}
          onChange={(e) => setStudentGroupId(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
          placeholder="Enter Student Group ID"
        />
        <Button onClick={handleSubscribe}>
          Get Calendar Subscription Link
        </Button>
      </div>
    </div>
  );
};

export default CalendarPage;

