import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export default function NfeFilters({ filters, setFilters, onApply, onReset, clientes }) {
  const handleChange = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 text-foreground font-medium">
          <Filter className="w-4 h-4" /> Filtros de Busca
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs">Período de Emissão</Label>
            <div className="flex items-center gap-2">
              <Input type="date" value={filters.data_inicio} onChange={e => handleChange('data_inicio', e.target.value)} className="h-9 text-foreground" />
              <span className="text-muted-foreground">até</span>
              <Input type="date" value={filters.data_fim} onChange={e => handleChange('data_fim', e.target.value)} className="h-9 text-foreground" />
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={filters.cliente_id} onValueChange={v => handleChange('cliente_id', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Em digitação">Em digitação</SelectItem>
                <SelectItem value="Aguardando emissão">Aguardando emissão</SelectItem>
                <SelectItem value="Emitida">Emitida</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                <SelectItem value="Denegada">Denegada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Integrado Financeiro</Label>
            <Select value={filters.integrado_financeiro} onValueChange={v => handleChange('integrado_financeiro', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Integrado Contábil</Label>
            <Select value={filters.integrado_contabil} onValueChange={v => handleChange('integrado_contabil', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-6 flex items-end justify-end gap-2 mt-2">
            <Button variant="outline" onClick={onReset} className="h-9">
              <X className="w-4 h-4 mr-2" /> Limpar
            </Button>
            <Button onClick={onApply} className="h-9 bg-slate-800 hover:bg-slate-700 text-white">
              Buscar Notas
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}