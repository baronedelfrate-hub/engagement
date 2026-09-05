import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { Search, Filter, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getPhaseSequence, PHASES } from '@/lib/cobrancaService';

const CobrancaFilters = ({ onFilterChange, loading }) => {
  const { clientes } = useFinanceiroDropdowns();
  
  const [filters, setFilters] = useState({
    status: 'ativo',
    clienteId: 'ALL',
    dataInicio: '',
    dataFim: '',
    search: '',
    prazoStatus: 'ALL', // New filter
    fase: 'ALL' // New filter
  });

  const handleApply = () => {
    // We pass raw filters, parent component handles logic if needed, 
    // or we can pre-process dates here if `prazoStatus` maps to dates.
    // For now passing raw.
    onFilterChange(filters);
  };

  const handleClear = () => {
    const reset = { 
      status: 'ativo', 
      clienteId: 'ALL', 
      dataInicio: '', 
      dataFim: '', 
      search: '', 
      prazoStatus: 'ALL', 
      fase: 'ALL' 
    };
    setFilters(reset);
    onFilterChange(reset);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium text-sm">
        <Filter className="w-4 h-4" /> Filtros Avançados
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Buscar (Cliente)</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input 
              placeholder="Nome do cliente..." 
              className="pl-8 h-9 bg-slate-950 border-slate-700 text-xs"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Status do Título</Label>
          <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
            <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-700 text-slate-200">
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="ALL">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cliente Dropdown */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Cliente</Label>
          <Select value={filters.clienteId} onValueChange={(v) => setFilters({...filters, clienteId: v})}>
             <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] bg-slate-950 border-slate-700 text-slate-200">
              <SelectItem value="ALL">Todos</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New: Filter by Prazo */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Filtro de Prazo</Label>
          <Select value={filters.prazoStatus} onValueChange={(v) => setFilters({...filters, prazoStatus: v})}>
             <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-700 text-slate-200">
              <SelectItem value="ALL">Todos os Prazos</SelectItem>
              <SelectItem value="vencidos">Vencidos (Atrasados)</SelectItem>
              <SelectItem value="hoje">Vencendo Hoje</SelectItem>
              <SelectItem value="proximos_3">Próximos 3 dias</SelectItem>
              <SelectItem value="proximos_7">Próximos 7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* New: Filter by Phase */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Filtro de Fase</Label>
          <Select value={filters.fase} onValueChange={(v) => setFilters({...filters, fase: v})}>
             <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-700 text-slate-200">
              <SelectItem value="ALL">Todas as Fases</SelectItem>
              {getPhaseSequence().map(p => (
                <SelectItem key={p} value={p}>{PHASES[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Vencimento (De)</Label>
          <Input 
            type="date"
            className="h-9 bg-slate-950 border-slate-700 text-xs"
            value={filters.dataInicio}
            onChange={(e) => setFilters({...filters, dataInicio: e.target.value})}
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Vencimento (Até)</Label>
          <Input 
            type="date"
            className="h-9 bg-slate-950 border-slate-700 text-xs"
            value={filters.dataFim}
            onChange={(e) => setFilters({...filters, dataFim: e.target.value})}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-800/50">
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4 mr-2" /> Limpar
        </Button>
        <Button size="sm" onClick={handleApply} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Filter className="w-4 h-4 mr-2" /> Aplicar Filtros
        </Button>
      </div>
    </div>
  );
};

export default CobrancaFilters;