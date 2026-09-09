import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const variants = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const StatusBadge = ({ status, variant = 'neutral', pulse = false, className }) => {
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border relative overflow-hidden",
        variants[variant] || variants.neutral,
        className
      )}
    >
      {pulse && (
        <span className="absolute inset-0 bg-current opacity-10 animate-pulse-glow" />
      )}
      <span className="relative z-10">{status}</span>
    </motion.span>
  );
};

export default StatusBadge;