import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const CobrancaFiltersIntegrated = ({ onFilterChange, loading }) => {
  const { clientes } = useFinanceiroDropdowns();
  
  const [filters, setFilters] = useState({
    search: '',
    statusPrazo: 'ALL', // Vencidos, Hoje, Proximos
    clienteId: 'ALL',
    fase: 'ALL',
    minValor: '',
    maxValor: '',
    dataVencimentoInicio: '',
    dataVencimentoFim: ''
  });

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'ALL').length;

  useEffect(() => {
    const handler = setTimeout(() => {
        onFilterChange(filters);
    }, 500); // Debounce
    return () => clearTimeout(handler);
  }, [filters, onFilterChange]);

  const handleClear = () => {
    setFilters({
      search: '',
      statusPrazo: 'ALL',
      clienteId: 'ALL',
      fase: 'ALL',
      minValor: '',
      maxValor: '',
      dataVencimentoInicio: '',
      dataVencimentoFim: ''
    });
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
          <Filter className="w-4 h-4 text-blue-400" /> 
          Filtros Ativos
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-blue-900/50 text-blue-400 border-blue-800">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 text-xs text-muted-foreground hover:text-foreground px-2">
            <X className="w-3 h-3 mr-1" /> Limpar tudo
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Search */}
        <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
          <Label className="text-xs text-muted-foreground">Busca Rápida</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Cliente, Nº Título..." 
              className="pl-8 h-9 bg-background border-border text-xs focus:ring-blue-500/20"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {/* Status Prazo */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Situação do Prazo</Label>
          <Select value={filters.statusPrazo} onValueChange={(v) => setFilters(prev => ({ ...prev, statusPrazo: v }))}>
            <SelectTrigger className="h-9 bg-background border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              <SelectItem value="ALL">Todos os Prazos</SelectItem>
              <SelectItem value="vencidos" className="text-red-400">Vencidos</SelectItem>
              <SelectItem value="hoje" className="text-yellow-400">Vencendo Hoje</SelectItem>
              <SelectItem value="proximos_3" className="text-emerald-400">Próximos 3 Dias</SelectItem>
              <SelectItem value="proximos_7">Próximos 7 Dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Select value={filters.clienteId} onValueChange={(v) => setFilters(prev => ({ ...prev, clienteId: v }))}>
             <SelectTrigger className="h-9 bg-background border-border text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] bg-background border-border text-foreground">
              <SelectItem value="ALL">Todos</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fase */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fase da Régua</Label>
          <Select value={filters.fase} onValueChange={(v) => setFilters(prev => ({ ...prev, fase: v }))}>
             <SelectTrigger className="h-9 bg-background border-border text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              <SelectItem value="ALL">Todas as Fases</SelectItem>
              <SelectItem value="D-3">D-3 (Preventivo)</SelectItem>
              <SelectItem value="D+1">D+1 (Aviso)</SelectItem>
              <SelectItem value="D+5">D+5 (Cobrança)</SelectItem>
              <SelectItem value="D+10">D+10 (Ativa)</SelectItem>
              <SelectItem value="D+15">D+15 (Escalonamento)</SelectItem>
              <SelectItem value="D+30">D+30 (Jurídico)</SelectItem>
              <SelectItem value="RECUPERADO">Recuperados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Valor Range */}
        <div className="space-y-1 col-span-1">
            <Label className="text-xs text-muted-foreground">Faixa de Valor</Label>
            <div className="flex gap-2">
                <Input 
                    type="number" 
                    placeholder="Min" 
                    className="h-9 bg-background border-border text-xs w-full"
                    value={filters.minValor}
                    onChange={(e) => setFilters(prev => ({ ...prev, minValor: e.target.value }))}
                />
                <Input 
                    type="number" 
                    placeholder="Max" 
                    className="h-9 bg-background border-border text-xs w-full"
                    value={filters.maxValor}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxValor: e.target.value }))}
                />
            </div>
        </div>

        {/* Date Range */}
         <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Vencimento (Período)</Label>
            <div className="flex gap-2 items-center">
                 <Input 
                    type="date"
                    className="h-9 bg-background border-border text-xs"
                    value={filters.dataVencimentoInicio}
                    onChange={(e) => setFilters(prev => ({ ...prev, dataVencimentoInicio: e.target.value }))}
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                    type="date"
                    className="h-9 bg-background border-border text-xs"
                    value={filters.dataVencimentoFim}
                    onChange={(e) => setFilters(prev => ({ ...prev, dataVencimentoFim: e.target.value }))}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default CobrancaFiltersIntegrated;