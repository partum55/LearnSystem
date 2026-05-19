import './App.css'

const appUrl = import.meta.env.VITE_APP_URL || 'https://app.learnsystem.app'

const features = [
  {
    label: 'Courses',
    title: 'Course spaces that stay organized',
    text: 'Materials, modules, assignments, and announcements stay connected around each class.',
  },
  {
    label: 'Assessment',
    title: 'Submission and grading workflows',
    text: 'Students submit work, teachers review progress, and the academic record stays visible.',
  },
  {
    label: 'AI support',
    title: 'Study and course preparation tools',
    text: 'AI-assisted workflows help explain material, generate practice, and speed up preparation.',
  },
]

const metrics = [
  ['72%', 'module progress'],
  ['14', 'active assignments'],
  ['06', 'course modules'],
]

function App() {
  return (
    <main className="site-shell">
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="LearnSystem home">
          <span className="brand-mark">LS</span>
          <span>LearnSystem</span>
        </a>
        <div className="nav-actions">
          <a className="nav-link" href="#platform">Platform</a>
          <a className="button button-ghost" href={appUrl}>Sign in</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Learning platform for UCU</p>
          <h1>Academic work, organized around the course.</h1>
          <p className="hero-text">
            LearnSystem brings learning materials, submissions, grading, and AI-assisted study workflows into a focused workspace for students and teachers.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={appUrl}>Open app</a>
            <a className="button button-secondary" href="#platform">View platform</a>
          </div>
        </div>

        <section className="product-shot" aria-label="Course dashboard preview">
          <div className="shot-header">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="shot-body">
            <aside className="shot-sidebar">
              <div className="side-logo">LS</div>
              <div className="side-line active"></div>
              <div className="side-line"></div>
              <div className="side-line short"></div>
            </aside>
            <div className="shot-main">
              <div className="course-topline">
                <span>CS-241</span>
                <span>Spring 2026</span>
              </div>
              <h2>Algorithms and Data Structures</h2>
              <div className="progress-row">
                <span>Module progress</span>
                <strong>72%</strong>
              </div>
              <div className="progress-track"><span></span></div>
              <div className="metric-grid">
                {metrics.map(([value, label]) => (
                  <div className="metric-card" key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>

      <section id="platform" className="platform-section">
        <div className="section-heading">
          <p className="eyebrow">Platform</p>
          <h2>Built for daily academic operations.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.label}>
              <span>{feature.label}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>LearnSystem</span>
        <span>Ukrainian Catholic University</span>
      </footer>
    </main>
  )
}

export default App
