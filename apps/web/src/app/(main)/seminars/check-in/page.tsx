'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { seminarAttendanceApi } from '@/features/assignments/api/assignments.api';
import { Loading } from '@/components/Loading';

function SeminarCheckInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const [status, setStatus] = useState<'loading' | 'checking' | 'success' | 'already' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [checkInTime, setCheckInTime] = useState('');

  const checkInAttempted = useRef(false);

  useEffect(() => {
    if (userLoading) return;

    if (!currentUser) {
      // Redirect to login page and return back to check-in after login
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMsg('Check-in token is missing. Please scan a valid QR code.');
      return;
    }

    // Only run check-in once
    if (checkInAttempted.current) return;
    checkInAttempted.current = true;

    setStatus('checking');

    const executeCheckIn = async () => {
      try {
        const res = await seminarAttendanceApi.checkIn(token);
        setCheckInTime(new Date(res.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setStatus('success');
      } catch (err: any) {
        const responseData = err?.response?.data || err?.data;
        const code = responseData?.code || err?.code;
        const msg = responseData?.message || err?.message || 'Check-in failed';

        if (code === 'ALREADY_CHECKED_IN') {
          setStatus('already');
        } else {
          let readableMsg = msg;
          if (code === 'QR_EXPIRED') {
            readableMsg = 'This check-in QR code has expired. Please ask your instructor for a new one.';
          } else if (code === 'SESSION_CLOSED') {
            readableMsg = 'This check-in session has been closed by the instructor.';
          } else if (code === 'NOT_ENROLLED') {
            readableMsg = 'You are not enrolled in this course. Check-in is only permitted for enrolled students.';
          } else if (code === 'INVALID_TOKEN') {
            readableMsg = 'The check-in token is invalid or has expired.';
          } else if (code === 'INVALID_ASSIGNMENT_TYPE') {
            readableMsg = 'This assignment is not a seminar. QR check-in is restricted to seminars.';
          }
          setErrorMsg(readableMsg);
          setStatus('error');
        }
      }
    };

    executeCheckIn();
  }, [currentUser, userLoading, token, router]);

  if (userLoading || status === 'loading' || status === 'checking') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <Loading label={status === 'checking' ? 'Approving attendance...' : 'Verifying account...'} />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4" style={{ fontFamily: 'var(--font-body)' }}>
      <div 
        className="w-full max-w-md rounded-2xl border p-8 shadow-xl transition-all duration-300 text-center animate-fade-in"
        style={{ 
          background: 'var(--bg-surface)', 
          borderColor: 'var(--border-default)' 
        }}
      >
        {status === 'success' && (
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] animate-pulse">
              <span className="text-3xl text-[var(--fn-success)]">✓</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Attendance Approved
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Your check-in has been successfully registered.
              </p>
            </div>
            {checkInTime && (
              <div 
                className="rounded-lg p-3 text-2xs font-semibold inline-block border bg-[var(--bg-base)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Checked In: {checkInTime}
              </div>
            )}
            <div className="pt-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full btn btn-primary text-xs py-2.5 font-bold cursor-pointer transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {status === 'already' && (
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
              <span className="text-3xl text-[var(--fn-success)]">✓</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Attendance Already Approved
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                You have already checked in for this seminar assignment. No further action is required.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full btn btn-primary text-xs py-2.5 font-bold cursor-pointer transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
              <span className="text-3xl text-[var(--fn-error)]">!</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Check-In Failed
              </h1>
              <p className="text-xs text-[var(--fn-error)] leading-relaxed px-2">
                {errorMsg}
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <button 
                onClick={() => window.location.reload()}
                className="w-full rounded-lg border border-[var(--border-default)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full text-3xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeminarCheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <Loading label="Loading check-in..." />
      </div>
    }>
      <SeminarCheckInInner />
    </Suspense>
  );
}
