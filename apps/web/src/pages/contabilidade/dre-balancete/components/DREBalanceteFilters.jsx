import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDREBalancete } from '@/contexts/DREBalanceteContext';
import { Filter, Loader2, RotateCcw } from 'lucide-react';

export default function DREBalanceteFilters() {
  const { filters, setFilters, empresas, refreshData, loading } = useDREBalancete();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const today = new Date();
    setFilters(prev => ({
      ...prev,
      competencia: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      comparacao: '',
      tipo: 'Ambos',
      mostrarDetalhes: true,
      mostrarVariacao: true,
      mostrarPercentual: true,
    }));
  };

  return (
    <Card className="border-slate-200 shadow-sm mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <span>Filtros de Relatório</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold">Empresa</Label>
            <Select value={filters.empresa_id} onValueChange={(v) => handleFilterChange('empresa_id', v)}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold">Competência</Label>
            <Input 
              type="month" 
              value={filters.competencia} 
              onChange={(e) => handleFilterChange('competencia', e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold">Comparação (Opcional)</Label>
            <Input 
              type="month" 
              value={filters.comparacao} 
              onChange={(e) => handleFilterChange('comparacao', e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1 flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
            <Button onClick={refreshData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={resetFilters} title="Limpar Filtros" className="px-3">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="detalhes" 
              checked={filters.mostrarDetalhes} 
              onCheckedChange={(c) => handleFilterChange('mostrarDetalhes', c)} 
            />
            <Label htmlFor="detalhes" className="text-sm text-slate-700 cursor-pointer">Mostrar Detalhes (Subcontas)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="variacao" 
              checked={filters.mostrarVariacao} 
              onCheckedChange={(c) => handleFilterChange('mostrarVariacao', c)} 
            />
            <Label htmlFor="variacao" className="text-sm text-slate-700 cursor-pointer">Mostrar Variação (R$)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="percentual" 
              checked={filters.mostrarPercentual} 
              onCheckedChange={(c) => handleFilterChange('mostrarPercentual', c)} 
            />
            <Label htmlFor="percentual" className="text-sm text-slate-700 cursor-pointer">Mostrar Percentual (%)</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}