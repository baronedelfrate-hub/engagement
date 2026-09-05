import React from 'react';
import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

const EmptyState = ({ title = "Nenhum registro encontrado", description = "Tente ajustar seus filtros ou adicione um novo registro.", icon: Icon = SearchX }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]"
    >
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
        <div className="w-20 h-20 bg-slate-800/80 backdrop-blur rounded-full flex items-center justify-center relative border border-white/10 group-hover:border-white/20 transition-colors">
          <Icon className="h-10 w-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
        {title}
      </h3>
      <p className="text-slate-400 max-w-sm mx-auto">
        {description}
      </p>
    </motion.div>
  );
};

export default EmptyState;