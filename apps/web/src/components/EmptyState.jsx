import React from 'react';
import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

const EmptyState = ({ title = "Nenhum registro encontrado", description = "Tente ajustar seus filtros ou adicione um novo registro.", icon: Icon = SearchX }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]"
    >
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
        <div className="w-20 h-20 bg-muted backdrop-blur rounded-full flex items-center justify-center relative border border-border group-hover:border-primary/30 transition-colors">
          <Icon className="h-10 w-10 text-muted-foreground group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {description}
      </p>
    </motion.div>
  );
};

export default EmptyState;
