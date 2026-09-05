import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export default function FiscalDashboardFilters({ filters, setFilters, dropdowns }) {
  
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      empresa: 'all',
      tipoDocumento: 'all',
      status: 'all',
      fornecedor: 'all',
      cliente: 'all'
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 text-foreground font-medium">
          <Filter className="w-4 h-4" />
          Filtros do Dashboard
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <div className="space-y-1.5 col-span-1 md:col-span-2 lg:col-span-2">
            <Label>Período de Emissão</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={filters.dataInicio} 
                onChange={(e) => handleChange('dataInicio', e.target.value)}
                className="text-foreground"
              />
              <span className="text-muted-foreground">até</span>
              <Input 
                type="date" 
                value={filters.dataFim} 
                onChange={(e) => handleChange('dataFim', e.target.value)}
                className="text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={filters.empresa} onValueChange={(v) => handleChange('empresa', v)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {dropdowns.empresas?.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Documento</Label>
            <Select value={filters.tipoDocumento} onValueChange={(v) => handleChange('tipoDocumento', v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="nfe">NF-e (Produto)</SelectItem>
                <SelectItem value="nfse">NFS-e (Serviço)</SelectItem>
                <SelectItem value="cte">CT-e</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="autorizado">Autorizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor/Cliente</Label>
            <Select value={filters.fornecedor} onValueChange={(v) => handleChange('fornecedor', v)}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectGroup label="Clientes">
                  {dropdowns.clientes?.map(c => (
                    <SelectItem key={`c-${c.id}`} value={`c-${c.id}`}>{c.nome}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup label="Fornecedores">
                  {dropdowns.fornecedores?.map(f => (
                    <SelectItem key={`f-${f.id}`} value={`f-${f.id}`}>{f.nome}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <X className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
          <Button className="bg-slate-900 text-white hover:bg-slate-800">
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to render grouped options if needed, but standard shadcn has SelectGroup. 
// Adding minimal mock SelectGroup inline since it's standard radux-ui wrapper but might not be explicitly imported.
const SelectGroup = ({ label, children }) => (
    <>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
        {children}
    </>
);