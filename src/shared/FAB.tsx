// src/shared/FAB.tsx
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export const FAB = ({
  children,
  onClick,
  label,
  hidden,
}: {
  children: ReactNode;
  onClick:  () => void;
  label?:   string;
  hidden?:  boolean;
}) => (
  <motion.button
    initial={{ scale: 0, opacity: 0 }}
    animate={{
      scale:   hidden ? 0 : 1,
      opacity: hidden ? 0 : 1,
    }}
    transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.15 }}
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    aria-hidden={hidden}
    tabIndex={hidden ? -1 : undefined}
    className="fixed bottom-6 right-6 z-40 h-14 px-5 rounded-full flex items-center gap-2 font-semibold text-white shadow-2xl"
    style={{
      background: 'linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%)',
      boxShadow:  '0 12px 40px rgba(var(--accent-from-rgb, 124,140,255), 0.45), 0 0 0 1px rgba(255,255,255,0.18) inset',
      pointerEvents: hidden ? 'none' : 'auto',
    }}
  >
    {children}
    {label && <span className="text-sm tracking-tight">{label}</span>}
  </motion.button>
);