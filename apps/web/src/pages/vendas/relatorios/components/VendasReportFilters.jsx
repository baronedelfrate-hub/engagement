import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FilterX, Search } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const VendasReportFilters = ({ filters, setFilters, onApply, onClear, source }) => {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from('clientes').select('id, nome').order('nome');
      if (data) setClientes(data);
    };
    fetchClientes();
  }, []);

  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusOptions = () => {
    if (source === 'pedidos_venda') {
      return [
        { value: 'rascunho', label: 'Rascunho' },
        { value: 'confirmado', label: 'Confirmado' },
        { value: 'em_separacao', label: 'Em Separação' },
        { value: 'enviado', label: 'Enviado' },
        { value: 'faturado', label: 'Faturado' },
        { value: 'cancelado', label: 'Cancelado' },
      ];
    }
    return [
      { value: 'rascunho', label: 'Rascunho' },
      { value: 'pendente', label: 'Pendente' },
      { value: 'enviado', label: 'Enviado' },
      { value: 'aprovado', label: 'Aprovado' },
      { value: 'rejeitado', label: 'Rejeitado' },
    ];
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 pt-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm uppercase text-slate-500 font-bold tracking-wider">
            Filtros do Relatório
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear} 
            className="h-8 px-2 text-slate-500 hover:text-red-500"
          >
            <FilterX className="h-4 w-4 mr-2" /> Limpar Filtros
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 pb-4">
        {/* Date Range */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Período (Data Emissão)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input 
              type="date" 
              value={filters.dataInicio} 
              onChange={e => handleChange('dataInicio', e.target.value)} 
              className="text-xs" 
            />
            <Input 
              type="date" 
              value={filters.dataFim} 
              onChange={e => handleChange('dataFim', e.target.value)} 
              className="text-xs" 
            />
          </div>
        </div>

        {/* Cliente */}
        <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cliente</Label>
            <Select value={filters.clienteId} onValueChange={v => handleChange('clienteId', v)}>
                <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODOS">Todos os Clientes</SelectItem>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={filters.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {getStatusOptions().map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Valor */}
        <div className="space-y-1.5">
            <Label className="text-xs font-medium">Faixa de Valor</Label>
            <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Min (R$)" 
                  value={filters.faixaValorMin} 
                  onChange={e => handleChange('faixaValorMin', e.target.value)} 
                  className="text-xs" 
                />
                <Input 
                  type="number" 
                  placeholder="Max (R$)" 
                  value={filters.faixaValorMax} 
                  onChange={e => handleChange('faixaValorMax', e.target.value)} 
                  className="text-xs" 
                />
            </div>
        </div>

        <Button 
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={onApply}
        >
            <Search className="h-4 w-4 mr-2" /> Aplicar Filtros
        </Button>
      </CardContent>
    </Card>
  );
};

export default VendasReportFilters;