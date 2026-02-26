import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { pageTransition } from './variants';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
};
