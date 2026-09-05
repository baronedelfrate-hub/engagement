import React from 'react';
import { FileText, CalendarDays, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LOGO_URL = "https://horizons-cdn.hostinger.com/43ae158d-775e-48c7-b200-7254194a0f9e/af31af53b69a979ae681cddadfef2c25.png";

const RelatoriosFinanceirosReportHeader = ({ title, dateRange, activeFiltersCount, onClearFilters }) => {
  return (
    <div className="bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex items-center gap-6 z-10">
            <div className="bg-white p-3 rounded-lg shadow-sm w-32 h-16 flex items-center justify-center shrink-0">
                <img src={LOGO_URL} alt="ENGAGEMENT Logo" className="max-w-full max-h-full object-contain" />
            </div>
            
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="h-6 w-6 text-orange-500" />
                    {title}
                </h1>
                <p className="text-slate-400 text-sm">ENGAGEMENT Consultoria Empresarial</p>
            </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3 z-10 w-full md:w-auto">
            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700 w-full md:w-auto">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                <span>{dateRange || 'Período Completo (Sem filtro de data)'}</span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <Badge variant="outline" className="bg-slate-800/80 text-slate-300 border-slate-700 py-1.5 px-3">
                    <Filter className="h-3.5 w-3.5 mr-2 text-orange-500" />
                    {activeFiltersCount} filtros ativos
                </Badge>
                {activeFiltersCount > 0 && (
                    <button 
                        onClick={onClearFilters}
                        className="text-xs text-orange-500 hover:text-orange-400 underline underline-offset-2 transition-colors"
                    >
                        Limpar
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default RelatoriosFinanceirosReportHeader;