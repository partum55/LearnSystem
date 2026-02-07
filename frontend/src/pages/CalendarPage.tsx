import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button, Layout } from '../components';

const CalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  // Initialize state directly from user.id
  const [studentGroupId, setStudentGroupId] = useState(() => user?.id?.toString() || '');
  const [subscriptionUrl, setSubscriptionUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateUrl = () => {
    if (!studentGroupId) {
      alert('Please enter a valid Student Group ID');
      return;
    }
    const url = `${window.location.origin}/api/calendar/student/${studentGroupId}/subscribe`;
    setSubscriptionUrl(url);
  };

  const handleCopyUrl = () => {
    if (subscriptionUrl) {
      navigator.clipboard.writeText(subscriptionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Calendar Integration</h1>
        <p className="text-gray-600 mb-6">
          Subscribe to your course deadlines in your favorite calendar application
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Get Your Calendar Subscription Link</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student Group ID
              </label>
              <input
                type="text"
                value={studentGroupId}
                onChange={(e) => setStudentGroupId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter Student Group ID"
              />
            </div>

            <Button onClick={handleGenerateUrl} className="w-full sm:w-auto">
              Generate Subscription Link
            </Button>
          </div>

          {subscriptionUrl && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                Your Calendar Subscription URL:
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded text-sm overflow-x-auto">
                  {subscriptionUrl}
                </code>
                <Button onClick={handleCopyUrl} variant="secondary">
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">How to Subscribe</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">📅 Google Calendar</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Copy the subscription URL above</li>
                <li>Open Google Calendar</li>
                <li>Click the "+" next to "Other calendars"</li>
                <li>Select "From URL"</li>
                <li>Paste the URL and click "Add calendar"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">📆 Outlook Calendar</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Copy the subscription URL above</li>
                <li>Open Outlook Calendar</li>
                <li>Go to "Add calendar" → "Subscribe from web"</li>
                <li>Paste the URL and click "Import"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">🍎 Apple Calendar</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>Copy the subscription URL above</li>
                <li>Open Calendar app</li>
                <li>Go to "File" → "New Calendar Subscription"</li>
                <li>Paste the URL and click "Subscribe"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarPage;
