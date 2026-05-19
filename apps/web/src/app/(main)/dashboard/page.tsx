import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-display)' }}>
          Dashboard Overview
        </p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {getGreeting()}, {displayName}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>My Courses</h2>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>You are not enrolled in any courses yet.</p>
        </div>
        
        <div className="p-6 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Due Today</h2>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Nothing is due today.</p>
        </div>

        <div className="p-6 rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent Activity</h2>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No recent activity to show.</p>
        </div>
      </div>
    </div>
  );
}
