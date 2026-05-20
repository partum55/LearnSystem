import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button, Layout } from '../components';
import calendarApi, { CalendarDay, ConflictItem, DeadlineItem } from '../api/calendar';

const CalendarPage: React.FC = () => {
  const { user } = useAuthStore();
  const [studentGroupId, setStudentGroupId] = useState(() => user?.id?.toString() || '');
  const [subscriptionUrl, setSubscriptionUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [deadlineFeed, setDeadlineFeed] = useState<DeadlineItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const monthLabel = useMemo(
    () => selectedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [selectedMonth]
  );

  const loadCalendarData = async () => {
    if (!studentGroupId) return;

    setLoading(true);
    setError(null);
    try {
      const [monthData, conflictData, deadlines] = await Promise.all([
        calendarApi.getMonth(studentGroupId, selectedMonth.getFullYear(), selectedMonth.getMonth() + 1),
        calendarApi.getConflicts(studentGroupId),
        calendarApi.getDeadlinesForGroup(studentGroupId),
      ]);
      setCalendarDays(monthData);
      setConflicts(conflictData);
      setDeadlineFeed(deadlines);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load calendar data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownloadIcs = async () => {
    if (!studentGroupId) return;

    try {
      const response = await calendarApi.downloadIcs(studentGroupId);
      const disposition = (response.headers?.['content-disposition'] ?? '') as string;
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || `calendar-${studentGroupId}.ics`;

      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download ICS';
      alert(message);
    }
  };

  const shiftMonth = (direction: 1 | -1) => {
    setSelectedMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Calendar Integration
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          Subscribe to your deadlines and review workload/conflicts directly from backend data.
        </p>

        <div
          className="rounded-lg p-6 mb-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Student Group
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

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerateUrl}>Generate Subscription Link</Button>
              <Button variant="secondary" onClick={() => void loadCalendarData()} disabled={loading}>
                {loading ? 'Loading…' : 'Load Deadlines'}
              </Button>
              <Button variant="secondary" onClick={() => void handleDownloadIcs()}>
                Download ICS
              </Button>
            </div>
          </div>

          {subscriptionUrl && (
            <div
              className="mt-6 p-4 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
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

        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Month workload</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => shiftMonth(-1)}>Prev</Button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{monthLabel}</span>
              <Button variant="secondary" onClick={() => shiftMonth(1)}>Next</Button>
              <Button variant="secondary" onClick={() => void loadCalendarData()}>Refresh</Button>
            </div>
          </div>

          {error && <p className="text-sm mb-2" style={{ color: 'var(--fn-error)' }}>{error}</p>}

          {calendarDays.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No month data loaded yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {calendarDays.map((day) => (
                <div key={day.date} className="rounded-md px-3 py-2 flex items-center justify-between" style={{ background: 'var(--bg-base)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{day.date}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(day.deadlines || []).length} deadlines</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: day.isOverloaded ? 'var(--fn-warning)' : 'var(--text-secondary)' }}>
                      {day.workloadMinutes} min
                    </p>
                    {day.isOverloaded && <p className="text-xs" style={{ color: 'var(--fn-warning)' }}>Overloaded</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Conflicts</h3>
            {conflicts.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conflict data.</p>
            ) : (
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={`${conflict.date}-${index}`} className="rounded-md p-2" style={{ background: 'var(--bg-base)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{conflict.date}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{conflict.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Upcoming deadlines</h3>
            {deadlineFeed.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deadlineFeed.slice(0, 20).map((deadline) => (
                  <div key={deadline.id} className="rounded-md p-2" style={{ background: 'var(--bg-base)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{deadline.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(deadline.dueAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarPage;
