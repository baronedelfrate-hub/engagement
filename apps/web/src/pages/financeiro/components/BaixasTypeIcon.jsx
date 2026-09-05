import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BaixasTypeIcon = ({ type }) => {
  const isPagar = type === 'PAGAR';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isPagar ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {isPagar ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 border-slate-700 text-white">
          <p>{isPagar ? 'Contas a Pagar (Saída)' : 'Contas a Receber (Entrada)'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BaixasTypeIcon;