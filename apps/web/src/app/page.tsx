import { createSupabaseServerClient } from '../lib/supabase/server';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { 
  AcademicCapIcon, 
  ClipboardDocumentCheckIcon, 
  SparklesIcon, 
  CalendarDaysIcon,
  UserPlusIcon,
  BookOpenIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const features = [
    { icon: AcademicCapIcon, title: 'Courses', desc: 'Manage your academic courses and materials in one place.' },
    { icon: ClipboardDocumentCheckIcon, title: 'Assignments', desc: 'Track deadlines and submit your work with ease.' },
    { icon: SparklesIcon, title: 'AI Assistant', desc: 'Boost your learning with built-in AI tools.' },
    { icon: CalendarDaysIcon, title: 'Calendar', desc: 'Stay organized with an integrated academic calendar.' },
  ];

  const steps = [
    { icon: UserPlusIcon, title: 'Sign Up', desc: 'Create your account using your university email.' },
    { icon: BookOpenIcon, title: 'Join Courses', desc: 'Enroll in courses and access learning materials.' },
    { icon: RocketLaunchIcon, title: 'Learn', desc: 'Engage with content and complete assignments.' },
  ];

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      {/* Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg-base) 85%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>LearnSystem</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <a href="/dashboard" className="btn btn-primary btn-sm">Go to Dashboard</a>
            ) : (
              <>
                <a href="/login" className="btn btn-ghost btn-sm">Login</a>
                <a href="/register" className="btn btn-primary btn-sm">Register</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center pt-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, var(--text-primary), transparent)` }} />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-8" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
            Your academic journey starts here
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            A modern learning management system for Ukrainian Catholic University
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {isAuthenticated ? (
              <a href="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</a>
            ) : (
              <>
                <a href="/login" className="btn btn-primary btn-lg">Sign In</a>
                <a href="/register" className="btn btn-secondary btn-lg">Get Started</a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Everything you need to learn</h2>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>Powerful tools designed for modern education</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="card p-6 h-full" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--bg-active)' }}>
                  <feature.icon className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>LS</div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>LearnSystem</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>&copy; 2026 Ukrainian Catholic University. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
