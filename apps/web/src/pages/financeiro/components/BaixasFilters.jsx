import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FilterX } from 'lucide-react';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';

const BaixasFilters = ({ filters, setFilters, onClear }) => {
  const dropdowns = useFinanceiroDropdowns();

  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-lg">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Filtros Avançados</h3>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-slate-400 hover:text-white hover:bg-slate-800">
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Tipo de Conta</Label>
            <Select value={filters.tipoConta} onValueChange={v => handleChange('tipoConta', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AMBOS">Ambos</SelectItem>
                <SelectItem value="PAGAR">Contas a Pagar</SelectItem>
                <SelectItem value="RECEBER">Contas a Receber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Status</Label>
            <Select value={filters.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                <SelectItem value="PAGO">Pagos / Recebidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Período (Início)</Label>
            <Input 
              type="date" 
              className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
              value={filters.dataInicio}
              onChange={e => handleChange('dataInicio', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Período (Fim)</Label>
            <Input 
              type="date" 
              className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"
              value={filters.dataFim}
              onChange={e => handleChange('dataFim', e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Categoria</Label>
            <Select value={filters.categoriaId} onValueChange={v => handleChange('categoriaId', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                {dropdowns.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Centro de Custo</Label>
            <Select value={filters.centroCustoId} onValueChange={v => handleChange('centroCustoId', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {dropdowns.centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Entidade (Fornec./Cliente)</Label>
            <Select value={filters.entidadeId} onValueChange={v => handleChange('entidadeId', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {filters.tipoConta !== 'RECEBER' && dropdowns.fornecedores.map(f => <SelectItem key={f.id} value={f.id}>(F) {f.nome}</SelectItem>)}
                {filters.tipoConta !== 'PAGAR' && dropdowns.clientes.map(c => <SelectItem key={c.id} value={c.id}>(C) {c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Banco</Label>
            <Select value={filters.bancoId} onValueChange={v => handleChange('bancoId', v)}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-100"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {dropdowns.bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BaixasFilters;