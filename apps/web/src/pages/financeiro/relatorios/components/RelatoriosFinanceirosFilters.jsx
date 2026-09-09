import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FilterX, Search } from 'lucide-react';

const RelatoriosFinanceirosFilters = ({ filters, setFilters, onApply, onClear, dropdowns, source }) => {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const isPagar = source === 'CONTAS_PAGAR';

  return (
    <Card className="bg-background border-border text-foreground shadow-xl">
      <CardHeader className="pb-3 pt-4 border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm uppercase text-orange-500 font-bold tracking-wider">
            Filtros Avançados
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear} 
            className="h-8 px-2 text-muted-foreground hover:text-red-400 hover:bg-muted"
          >
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 pb-4">
        {/* Date Range */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Período (Vencimento)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input 
              type="date" 
              value={filters.dataInicio} 
              onChange={e => handleChange('dataInicio', e.target.value)} 
              className="text-xs bg-muted border-border text-foreground" 
            />
            <Input 
              type="date" 
              value={filters.dataFim} 
              onChange={e => handleChange('dataFim', e.target.value)} 
              className="text-xs bg-muted border-border text-foreground" 
            />
          </div>
        </div>

        {/* Status & Banco */}
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="PENDENTE">Pendentes</SelectItem>
                    <SelectItem value="PAGO">Pagos / Recebidos</SelectItem>
                </SelectContent>
            </Select>
            </div>
            <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Banco</Label>
            <Select value={filters.bancoId} onValueChange={v => handleChange('bancoId', v)}>
                <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {dropdowns.bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
            </Select>
            </div>
        </div>

        {/* Entidade */}
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{isPagar ? 'Fornecedor' : 'Cliente'}</Label>
            <Select value={filters.entidadeId} onValueChange={v => handleChange('entidadeId', v)}>
                <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {isPagar 
                        ? dropdowns.fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)
                        : dropdowns.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                    }
                </SelectContent>
            </Select>
        </div>

        {/* Categoria & Subcategoria */}
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={filters.categoriaId} onValueChange={v => { handleChange('categoriaId', v); handleChange('subcategoriaId', 'TODOS'); }}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todas</SelectItem>
                        {dropdowns.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subcategoria</Label>
                <Select value={filters.subcategoriaId} onValueChange={v => handleChange('subcategoriaId', v)} disabled={filters.categoriaId === 'TODOS'}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground disabled:opacity-50">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todas</SelectItem>
                        {dropdowns.subcategorias
                            .filter(s => s.categoria_id === filters.categoriaId)
                            .map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Centro de Custo & Projeto */}
        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
                <Select value={filters.centroCustosId} onValueChange={v => handleChange('centroCustosId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        {dropdowns.centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Projeto</Label>
                <Select value={filters.projetoId} onValueChange={v => handleChange('projetoId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        {dropdowns.projetos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Pagamentos / Documentos */}
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo/Condição Pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
                <Select value={filters.tipoPagamentoId} onValueChange={v => handleChange('tipoPagamentoId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos Tipos</SelectItem>
                        {dropdowns.tiposPagamento.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.condicaoPagamentoId} onValueChange={v => handleChange('condicaoPagamentoId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue placeholder="Condição" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todas Condições</SelectItem>
                        {dropdowns.condicoesPagamento.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de Documento</Label>
                <Select value={filters.tipoDocumentoId} onValueChange={v => handleChange('tipoDocumentoId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        {dropdowns.tiposDocumento.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Origem</Label>
                <Select value={filters.origemId} onValueChange={v => handleChange('origemId', v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todas</SelectItem>
                        {dropdowns.origens.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <Button 
            className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-900/20" 
            onClick={onApply}
        >
            <Search className="h-4 w-4 mr-2" /> Aplicar Filtros
        </Button>
      </CardContent>
    </Card>
  );
};

export default RelatoriosFinanceirosFilters;