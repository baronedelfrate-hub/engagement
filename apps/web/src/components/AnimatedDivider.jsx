import React from 'react';
import { motion } from 'framer-motion';

const AnimatedDivider = () => {
  return (
    <div className="relative h-[1px] w-full my-6 overflow-hidden">
       <div className="absolute inset-0 bg-border" />
       <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent w-1/2"
       />
    </div>
  );
};

export default AnimatedDivider;