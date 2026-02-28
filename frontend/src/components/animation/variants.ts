import type { Variants } from 'motion/react';

// Obsidian easing curve
const ease = [0.16, 1, 0.3, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease } },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, transition: { duration: 0.15, ease } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15, ease } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
};

export const collapse: Variants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: { height: { duration: 0.25, ease }, opacity: { duration: 0.2, ease, delay: 0.05 } },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: { height: { duration: 0.2, ease }, opacity: { duration: 0.1, ease } },
  },
};

export const tabContent: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12, ease } },
};

export const wizardSlide = (direction: number): Variants => ({
  hidden: { opacity: 0, x: direction > 0 ? 40 : -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, x: direction > 0 ? -40 : 40, transition: { duration: 0.2, ease } },
});

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
};
