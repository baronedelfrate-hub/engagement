import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PageHeader({ title, description, action, showBack = false }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
      className="mb-8 relative z-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-110 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-foreground tracking-tight"
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-muted-foreground mt-1 text-lg font-light"
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>
        {action && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex-shrink-0"
          >
            {action}
          </motion.div>
        )}
      </div>
      {/* Decorative animated underline */}
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="h-[2px] bg-gradient-to-r from-primary via-[hsl(var(--brand-orange))]/60 to-transparent mt-6 rounded-full" 
      />
    </motion.div>
  );
}

export default PageHeader;