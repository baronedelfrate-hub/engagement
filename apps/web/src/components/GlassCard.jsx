import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const GlassCard = React.forwardRef(({ className, children, gradient = "from-blue-500/50 to-purple-500/50", ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-xl",
        className
      )}
      {...props}
    >
      {/* Animated Gradient Border Effect */}
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br", gradient)} style={{ mixBlendMode: 'overlay' }} />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
});

GlassCard.displayName = "GlassCard";

export default GlassCard;