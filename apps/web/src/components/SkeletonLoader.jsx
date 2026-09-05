import React from 'react';
import { cn } from '@/lib/utils';

export const SkeletonLoader = ({ className, count = 1, type = "line" }) => {
  // type: 'line', 'circle', 'card', 'table-row'
  
  if (type === 'table-row') {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
             <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
             <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
             <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
             <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
       <div className={cn("grid gap-4", className)}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-6 border border-white/5 animate-pulse">
             <div className="h-5 bg-slate-700/50 rounded w-1/3 mb-4"></div>
             <div className="h-10 bg-slate-700/50 rounded w-1/2 mb-2"></div>
             <div className="h-4 bg-slate-700/50 rounded w-1/4"></div>
          </div>
        ))}
       </div>
    );
  }

  return (
    <div className={cn("animate-pulse space-y-2", className)}>
        {[...Array(count)].map((_, i) => (
            <div key={i} className={cn("bg-slate-700/50 rounded", type === 'circle' ? 'rounded-full' : '')} style={{ 
                height: type === 'circle' ? '3rem' : '1rem', 
                width: type === 'circle' ? '3rem' : '100%' 
            }} />
        ))}
    </div>
  );
};

export default SkeletonLoader;