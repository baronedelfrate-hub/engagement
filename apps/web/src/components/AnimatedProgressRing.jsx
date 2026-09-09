import React from 'react';
import { motion } from 'framer-motion';

const AnimatedProgressRing = ({ progress, size = 60, strokeWidth = 4, color = "#3b82f6" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="text-muted-foreground/20"
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-xs font-bold text-foreground">
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default AnimatedProgressRing;