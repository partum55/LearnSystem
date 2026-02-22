import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button, Layout } from '../components';

const CalendarPage: React.FC = () => {
  const { user } = useAuthStore();
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
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Calendar Integration
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          Subscribe to your course deadlines in your favorite calendar application
        </p>

        <div
          className="rounded-lg p-6 mb-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Get Your Calendar Subscription Link
          </h2>

          <div className="space-y-4">
            <div className="input-group">
              <label className="label">Student Group ID</label>
              <input
                type="text"
                value={studentGroupId}
                onChange={(e) => setStudentGroupId(e.target.value)}
                className="input"
                placeholder="Enter Student Group ID"
              />
            </div>

            <Button onClick={handleGenerateUrl} className="w-full sm:w-auto">
              Generate Subscription Link
            </Button>
          </div>

          {subscriptionUrl && (
            <div
              className="mt-6 p-4 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Your Calendar Subscription URL:
              </h3>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 p-2 rounded text-sm overflow-x-auto"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
                >
                  {subscriptionUrl}
                </code>
                <Button onClick={handleCopyUrl} variant="secondary">
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-lg p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            How to Subscribe
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Google Calendar</h3>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Copy the subscription URL above</li>
                <li>Open Google Calendar</li>
                <li>Click the "+" next to "Other calendars"</li>
                <li>Select "From URL"</li>
                <li>Paste the URL and click "Add calendar"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Outlook Calendar</h3>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Copy the subscription URL above</li>
                <li>Open Outlook Calendar</li>
                <li>Go to "Add calendar" &rarr; "Subscribe from web"</li>
                <li>Paste the URL and click "Import"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Apple Calendar</h3>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>Copy the subscription URL above</li>
                <li>Open Calendar app</li>
                <li>Go to "File" &rarr; "New Calendar Subscription"</li>
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
