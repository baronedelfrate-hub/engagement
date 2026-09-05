import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, XCircle } from 'lucide-react';

const ConciliacaoBancariaFilters = ({ filters, setFilters, onApply, onClear, dropdowns }) => {
  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
            <div className="space-y-2">
              <Label className="text-slate-400">Data Início</Label>
              <Input 
                type="date" 
                className="bg-slate-800 border-slate-700 text-slate-200"
                value={filters.dataInicio}
                onChange={e => setFilters({...filters, dataInicio: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Data Fim</Label>
              <Input 
                type="date" 
                className="bg-slate-800 border-slate-700 text-slate-200"
                value={filters.dataFim}
                onChange={e => setFilters({...filters, dataFim: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Banco</Label>
              <Select value={filters.bancoId} onValueChange={v => setFilters({...filters, bancoId: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Todos os Bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Bancos</SelectItem>
                  {dropdowns.bancos?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Status</Label>
              <Select value={filters.statusConciliacao} onValueChange={v => setFilters({...filters, statusConciliacao: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="NAO_CONCILIADO">Não Conciliado</SelectItem>
                  <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <Button onClick={onApply} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-none">
              <Filter className="h-4 w-4 mr-2" /> Aplicar
            </Button>
            <Button variant="outline" onClick={onClear} className="border-slate-700 text-slate-300 hover:bg-slate-800 flex-none px-3">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConciliacaoBancariaFilters;