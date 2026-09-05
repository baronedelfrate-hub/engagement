import React from 'react';
import { PieChart } from 'lucide-react';

export default function B3Tab3() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-blue-50 p-5 rounded-full mb-6 ring-8 ring-blue-50/50">
        <PieChart className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-3">Apuração de Resultado</h3>
      <p className="text-slate-500 max-w-md text-base leading-relaxed">
        Conteúdo em desenvolvimento. Esta aba será dedicada à visualização e consolidação das apurações de resultado do período.
      </p>
    </div>
  );
}