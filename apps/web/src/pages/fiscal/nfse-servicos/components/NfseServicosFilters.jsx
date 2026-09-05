import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Search } from 'lucide-react';

export default function NfseServicosFilters({ filters, setFilters, onApply, onReset, clientes, servicos, municipios }) {
  const handleChange = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 text-slate-700 font-medium">
          <Filter className="w-4 h-4" /> Filtros de Busca
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          
          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs">Busca Rápida</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Número, RPS, Cliente..." 
                value={filters.search || ''} 
                onChange={e => handleChange('search', e.target.value)} 
                className="pl-9 h-9 text-slate-900" 
              />
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs">Período de Emissão</Label>
            <div className="flex items-center gap-2">
              <Input type="date" value={filters.data_inicio || ''} onChange={e => handleChange('data_inicio', e.target.value)} className="h-9 text-slate-900" />
              <span className="text-slate-400">até</span>
              <Input type="date" value={filters.data_fim || ''} onChange={e => handleChange('data_fim', e.target.value)} className="h-9 text-slate-900" />
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <Label className="text-xs">Faixa de Valor (R$)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Mínimo" value={filters.valor_min || ''} onChange={e => handleChange('valor_min', e.target.value)} className="h-9 text-slate-900" />
              <span className="text-slate-400">-</span>
              <Input type="number" placeholder="Máximo" value={filters.valor_max || ''} onChange={e => handleChange('valor_max', e.target.value)} className="h-9 text-slate-900" />
            </div>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="h-9 text-slate-900"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Em digitação">Em digitação</SelectItem>
                <SelectItem value="Aguardando emissão">Aguardando emissão</SelectItem>
                <SelectItem value="Emitida">Emitida</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Rejeitada">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={filters.cliente_id || 'all'} onValueChange={v => handleChange('cliente_id', v)}>
              <SelectTrigger className="h-9 text-slate-900"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Serviço</Label>
            <Select value={filters.servico_id || 'all'} onValueChange={v => handleChange('servico_id', v)}>
              <SelectTrigger className="h-9 text-slate-900"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {servicos?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Município</Label>
            <Select value={filters.municipio_id || 'all'} onValueChange={v => handleChange('municipio_id', v)}>
              <SelectTrigger className="h-9 text-slate-900"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {municipios?.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} - {m.uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-2 flex items-end justify-end gap-2 mt-2 xl:mt-0">
            <Button variant="outline" onClick={onReset} className="h-9 w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" /> Limpar
            </Button>
            <Button onClick={onApply} className="h-9 w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white">
              Buscar NFS-e
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}