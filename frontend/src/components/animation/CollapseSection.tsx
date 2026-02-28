import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { collapse } from './variants';

interface CollapseSectionProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export const CollapseSection: React.FC<CollapseSectionProps> = ({ isOpen, children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return isOpen ? <>{children}</> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          variants={collapse}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
