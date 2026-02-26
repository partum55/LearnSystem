import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { tabContent } from './variants';

interface TabTransitionProps {
  tabKey: string;
  children: React.ReactNode;
}

export const TabTransition: React.FC<TabTransitionProps> = ({ tabKey, children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        variants={tabContent}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
