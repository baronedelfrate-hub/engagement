import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useClientesDropdown } from '@/hooks/useClientesDropdown';

const ProjetosReportsFilters = ({ filters, setFilters, onFilter }) => {
  const { clientes, isLoading: loadingClientes } = useClientesDropdown();

  const handleClear = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      cliente_id: 'all',
      status: 'all'
    });
    onFilter({
      dataInicio: '',
      dataFim: '',
      cliente_id: 'all',
      status: 'all'
    });
  };

  const handleApply = () => {
    onFilter(filters);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Período (Início)</Label>
            <Input 
              type="date" 
              value={filters.dataInicio} 
              onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Período (Fim)</Label>
            <Input 
              type="date" 
              value={filters.dataFim} 
              onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select 
              value={filters.cliente_id} 
              onValueChange={(val) => setFilters(prev => ({ ...prev, cliente_id: val }))}
              disabled={loadingClientes}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes?.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={filters.status} 
              onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Planejamento">Planejamento</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Pausado">Pausado</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleClear}>
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button onClick={handleApply}>
            <Search className="h-4 w-4 mr-2" />
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjetosReportsFilters;