import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  BookOpenIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

/** Hook: triggers fade-in when element enters viewport */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-in-up');
          el.style.opacity = '1';
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

const RevealSection: React.FC<{ children: React.ReactNode; className?: string; delay?: string }> = ({ children, className = '', delay = '0ms' }) => {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{ opacity: 0, animationDelay: delay, animationFillMode: 'both' }}>
      {children}
    </div>
  );
};

const features = [
  { icon: AcademicCapIcon, key: 'courses' },
  { icon: ClipboardDocumentCheckIcon, key: 'assignments' },
  { icon: SparklesIcon, key: 'ai' },
  { icon: CalendarDaysIcon, key: 'calendar' },
] as const;

const steps = [
  { icon: UserPlusIcon, key: 'signup' },
  { icon: BookOpenIcon, key: 'join' },
  { icon: RocketLaunchIcon, key: 'learn' },
] as const;

export const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      {/* ── Nav Bar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--bg-base) 85%, transparent)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
            >
              LS
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              LearnSystem
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                {t('landing.goToDashboard', 'Go to Dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  {t('auth.login')}
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  {t('auth.register.createAccount')}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex items-center justify-center pt-14 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, var(--text-primary), transparent)`,
        }} />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-8 animate-fade-in"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
          >
            LS
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-in-up"
            style={{ fontFamily: 'var(--font-display)', lineHeight: 1.1, animationDelay: '150ms', animationFillMode: 'both' }}
          >
            {t('landing.heroTitle', 'Your academic journey starts here')}
          </h1>
          <p
            className="text-lg sm:text-xl mb-10 max-w-xl mx-auto animate-fade-in-up"
            style={{ color: 'var(--text-muted)', animationDelay: '300ms', animationFillMode: 'both' }}
          >
            {t('landing.heroSubtitle', 'A modern learning management system for Ukrainian Catholic University')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                {t('landing.goToDashboard', 'Go to Dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  {t('landing.signIn', 'Sign In')}
                </Link>
                <Link to="/register" className="btn btn-secondary btn-lg">
                  {t('landing.getStarted', 'Get Started')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {t('landing.featuresTitle', 'Everything you need to learn')}
            </h2>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              {t('landing.featuresSubtitle', 'Powerful tools designed for modern education')}
            </p>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, key }, i) => (
              <RevealSection key={key} delay={`${i * 100}ms`}>
                <div
                  className="card p-6 h-full"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'var(--bg-active)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {t(`landing.feature_${key}_title`, key)}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {t(`landing.feature_${key}_desc`, '')}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-4" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {t('landing.howItWorksTitle', 'Get started in minutes')}
            </h2>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ icon: Icon, key }, i) => (
              <RevealSection key={key} className="text-center" delay={`${i * 150}ms`}>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--bg-active)', border: '1px solid var(--border-default)' }}
                >
                  <Icon className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
                </div>
                <div
                  className="text-sm font-bold mb-2"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}
                >
                  {t('landing.step', 'Step')} {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  {t(`landing.step_${key}_title`, key)}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t(`landing.step_${key}_desc`, '')}
                </p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}
            >
              LS
            </div>
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              LearnSystem
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('landing.footer', '\u00a9 2024 Ukrainian Catholic University. All rights reserved.')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
