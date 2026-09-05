import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { MANIFESTACAO_OPTIONS, SITUACAO_OPTIONS } from '../utils/manifestacaoNFUtils';

export default function ManifestacaoNFFilters({ filters, setFilters, onApply, onReset, fornecedores }) {
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
            <Label className="text-xs">Fornecedor</Label>
            <Select value={filters.fornecedor_id} onValueChange={v => handleChange('fornecedor_id', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Chave de Acesso</Label>
            <Input 
              placeholder="Pesquisar chave..." 
              value={filters.chave_acesso} 
              onChange={e => handleChange('chave_acesso', e.target.value)} 
              className="h-9 text-foreground"
            />
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Manifestação</Label>
            <Select value={filters.status_manifestacao} onValueChange={v => handleChange('status_manifestacao', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MANIFESTACAO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Situação XML</Label>
            <Select value={filters.situacao_consulta} onValueChange={v => handleChange('situacao_consulta', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {SITUACAO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-1">
            <Label className="text-xs">Importado p/ Entrada</Label>
            <Select value={filters.importado_entrada} onValueChange={v => handleChange('importado_entrada', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-5 flex items-end justify-end gap-2">
            <Button variant="outline" onClick={onReset} className="h-9">
              <X className="w-4 h-4 mr-2" /> Limpar
            </Button>
            <Button onClick={onApply} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
              Buscar Notas
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}