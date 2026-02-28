import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { modalBackdrop, modalPanel } from './animation/variants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'large';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
  const reduced = useReducedMotion();

  const sizeClasses = {
    default: 'sm:max-w-lg',
    large: 'sm:max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0"
              style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
              onClick={onClose}
              variants={reduced ? undefined : modalBackdrop}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            {/* Modal */}
            <motion.div
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-2xl sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full`}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              variants={reduced ? undefined : modalPanel}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {title && (
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                      {title}
                    </h3>
                    <button
                      onClick={onClose}
                      className="p-1 rounded-md transition-colors"
                      style={{ color: 'var(--text-faint)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
