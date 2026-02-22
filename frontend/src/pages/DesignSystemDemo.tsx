import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Loading';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-12">
    <h2
      className="text-sm font-medium uppercase tracking-wider mb-4 pb-2"
      style={{ color: 'var(--text-faint)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-display)' }}
    >
      {title}
    </h2>
    {children}
  </section>
);

const Swatch: React.FC<{ label: string; sublabel: string; color: string; border?: boolean }> = ({ label, sublabel, color, border }) => (
  <div className="text-center">
    <div
      className="h-12 rounded-md mb-2"
      style={{ background: color, border: border ? '1px solid var(--border-default)' : 'none' }}
    />
    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
    <div className="text-xs" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{sublabel}</div>
  </div>
);

const DesignSystemDemo = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--bg-base)', fontFamily: 'var(--font-display)' }}>LS</span>
            </div>
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-display)' }}>
              Design System
            </span>
          </div>
          <h1
            className="text-2xl font-semibold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Obsidian
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--text-muted)' }}>
            A monochrome, dark-first design system. No accent colors in chrome — functional colors only for status. Built for focus.
          </p>
        </div>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="space-y-6">
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Surfaces</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Swatch label="Base" sublabel="#09090b" color="var(--bg-base)" border />
                <Swatch label="Surface" sublabel="#18181b" color="var(--bg-surface)" border />
                <Swatch label="Elevated" sublabel="#1e1e22" color="var(--bg-elevated)" border />
                <Swatch label="Overlay" sublabel="#27272a" color="var(--bg-overlay)" border />
                <Swatch label="Hover" sublabel="4% white" color="var(--bg-hover)" border />
              </div>
            </div>
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Text</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Swatch label="Primary" sublabel="#fafafa" color="var(--text-primary)" />
                <Swatch label="Secondary" sublabel="#a1a1aa" color="var(--text-secondary)" />
                <Swatch label="Muted" sublabel="#71717a" color="var(--text-muted)" />
                <Swatch label="Faint" sublabel="#52525b" color="var(--text-faint)" />
              </div>
            </div>
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Functional</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Swatch label="Success" sublabel="#22c55e" color="var(--fn-success)" />
                <Swatch label="Error" sublabel="#ef4444" color="var(--fn-error)" />
                <Swatch label="Warning" sublabel="#eab308" color="var(--fn-warning)" />
                <Swatch label="Info" sublabel="#a1a1aa" color="var(--text-secondary)" />
              </div>
            </div>
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <div className="space-y-3">
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>Sora / Display</span>
                  <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>Outfit / Body</span>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                    The quick brown fox jumps over the lazy dog. Body text is set in Outfit for excellent readability at smaller sizes. This is the workhorse of the system.
                  </p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>JetBrains Mono / Code</span>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    const system = &quot;obsidian&quot;;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="space-y-6">
            <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Variants</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>

              <p className="text-xs mt-6 mb-4" style={{ color: 'var(--text-muted)' }}>Sizes</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>

              <p className="text-xs mt-6 mb-4" style={{ color: 'var(--text-muted)' }}>States</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button isLoading>Loading</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* Inputs & Form */}
        <Section title="Form Controls">
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password.length > 0 && password.length < 8 && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--fn-error)' }}>Must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Select</label>
                <select className="input w-full">
                  <option>Student</option>
                  <option>Teacher</option>
                  <option>Admin</option>
                </select>
              </div>
              <div className="pt-2">
                <Button type="submit" isLoading={isSubmitting} className="w-full">
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Course Overview
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Introduction to Computer Science covers fundamental programming concepts.
                </p>
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
                  <span>Dr. Jane Smith</span>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span>Fall 2025</span>
                </div>
                <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-overlay)' }}>
                  <div className="h-1 rounded-full" style={{ width: '65%', background: 'var(--text-muted)' }} />
                </div>
                <div className="text-right text-xs mt-1" style={{ color: 'var(--text-faint)' }}>65%</div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <h3 className="text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Upcoming Assignment
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  Data Structures Homework #3 — Binary search tree operations
                </p>
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-overlay)', color: 'var(--fn-warning)' }}>
                  Due in 2 days
                </span>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm">View</Button>
                  <Button size="sm">Start</Button>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        {/* Badges & Tags */}
        <Section title="Badges">
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex flex-wrap gap-3">
              <span className="badge">Default</span>
              <span className="badge badge-success">Active</span>
              <span className="badge badge-error">Inactive</span>
              <span className="badge badge-warning">Pending</span>
            </div>
          </div>
        </Section>

        {/* Table */}
        <Section title="Table">
          <div className="table-container rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Alice Johnson', role: 'Student', status: 'Active' },
                  { name: 'Bob Williams', role: 'Teacher', status: 'Active' },
                  { name: 'Carol Davis', role: 'TA', status: 'Inactive' },
                ].map((user) => (
                  <tr key={user.name}>
                    <td>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    </td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`badge ${user.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Button variant="secondary" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm">Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Modal */}
        <Section title="Modal">
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          </div>
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              This is a modal dialog styled with the Obsidian design system. Dark backdrop with blur, elevated surface, subtle borders.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </Modal>
        </Section>

        {/* Loading */}
        <Section title="Loading States">
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Small</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Large</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Borders & Spacing */}
        <Section title="Borders & Radii">
          <div className="p-5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Subtle', border: 'var(--border-subtle)' },
                { label: 'Default', border: 'var(--border-default)' },
                { label: 'Strong', border: 'var(--border-strong)' },
              ].map((b) => (
                <div
                  key={b.label}
                  className="w-24 h-16 rounded-md flex items-center justify-center"
                  style={{ border: `1px solid ${b.border}`, background: 'var(--bg-elevated)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Obsidian Design System — LearnSystem UCU
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemDemo;
