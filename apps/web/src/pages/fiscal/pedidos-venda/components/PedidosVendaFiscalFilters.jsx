import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

export default function PedidosVendaFiscalFilters({ filters, setFilters, onSearch, onClear }) {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
      <div className="space-y-1">
        <Label>Número do Pedido</Label>
        <Input 
          placeholder="Ex: PV-123456" 
          value={filters.numero}
          onChange={(e) => handleChange('numero', e.target.value)}
        />
      </div>
      
      <div className="space-y-1">
        <Label>Cliente</Label>
        <Input 
          placeholder="Nome do cliente..." 
          value={filters.cliente}
          onChange={(e) => handleChange('cliente', e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={filters.status} onValueChange={(val) => handleChange('status', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="invoiced">Faturado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Período Emissão</Label>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={filters.data_inicio}
            onChange={(e) => handleChange('data_inicio', e.target.value)}
            className="w-full"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input 
            type="date" 
            value={filters.data_fim}
            onChange={(e) => handleChange('data_fim', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSearch} className="flex-1 bg-primary text-primary-foreground">
          <Search className="w-4 h-4 mr-2" />
          Buscar
        </Button>
        <Button variant="outline" onClick={onClear} title="Limpar Filtros">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}