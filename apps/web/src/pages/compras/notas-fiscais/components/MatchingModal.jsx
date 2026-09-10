import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Link2, Plus, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MatchingModal = ({ isOpen, onClose, nota, onMatchSuccess }) => {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search Logic
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');

  useEffect(() => {
    if (isOpen && nota) {
      const loadData = async () => {
        const [pedidosRes, fornecedoresRes] = await Promise.all([
          supabase.from('pedidos_compra').select('*').not('status', 'in', '("Recebido","Cancelado")'),
          supabase.from('fornecedores').select('id, nome, fantasia'),
        ]);
        setPedidos(pedidosRes.data || []);
        setFornecedores(fornecedoresRes.data || []);
      };
      loadData();

      setSelectedPedido(null);
      setSearchTerm('');
      setSupplierFilter(nota.fornecedor_id || 'all');
    }
  }, [isOpen, nota]);

  const getFornecedorName = (id) => {
      const f = fornecedores.find(forn => forn.id === id);
      return f ? (f.fantasia || f.nome) : 'Desconhecido';
  };

  // 1. Suggestions based on value proximity and supplier
  const suggestions = pedidos.filter(p => {
      if (!nota) return false;

      const sameSupplier = p.fornecedor_id === nota.fornecedor_id;
      const totalNota = parseFloat(nota.valor_total || 0);
      const valueMatch = Math.abs(parseFloat(p.valor_total || 0) - totalNota) < (totalNota * 0.05);

      return sameSupplier && valueMatch;
  });

  // 2. General Search
  const filteredPedidos = pedidos.filter(p => {
      const term = searchTerm.toLowerCase();
      const pId = (p.id || '').toLowerCase();
      const pNum = (p.numero || '').toLowerCase();
      const pVal = parseFloat(p.valor_total || 0).toFixed(2);
      const pFornecedor = getFornecedorName(p.fornecedor_id).toLowerCase();

      const matchesText = pId.includes(term) || pNum.includes(term) || pVal.includes(term) || pFornecedor.includes(term);
      const matchesSupplier = supplierFilter === 'all' || p.fornecedor_id === supplierFilter;

      return matchesText && matchesSupplier;
  });

  const handleVincular = async () => {
      if (!selectedPedido) return;
      setSaving(true);
      try {
          const { error } = await supabase.from('notas_fiscais_entrada').update({
              status: 'Em_Entrada',
              pedido_compra_id: selectedPedido.id
          }).eq('id', nota.id);
          if (error) throw error;

          toast({ title: "Vinculado", description: `Nota vinculada ao Pedido #${selectedPedido.numero || selectedPedido.id}` });
          onMatchSuccess();
          onClose();
      } catch (e) {
          toast({ title: "Erro", description: e.message || "Falha ao vincular.", variant: "destructive" });
      } finally {
          setSaving(false);
      }
  };

  const handleGerarAutomatico = async () => {
      setSaving(true);
      try {
           const { data: newPedido, error: pedidoError } = await insertWithCompanyId('pedidos_compra', {
               numero: `PC-AUTO-${Date.now().toString().slice(-6)}`,
               fornecedor_id: nota.fornecedor_id,
               data_pedido: new Date().toISOString().split('T')[0],
               valor_total: parseFloat(nota.valor_total || 0),
               status: 'Aberto',
           }, { chain: (q) => q.select().single() });
           if (pedidoError) throw pedidoError;

           const { error: notaError } = await supabase.from('notas_fiscais_entrada').update({
              status: 'Em_Entrada',
              pedido_compra_id: newPedido.id
          }).eq('id', nota.id);
          if (notaError) throw notaError;

           toast({ title: "Pedido Gerado", description: "Novo pedido criado a partir da nota." });
           onMatchSuccess();
           onClose();
      } catch (e) {
          toast({ title: "Erro", description: e.message || "Falha ao gerar pedido.", variant: "destructive" });
      } finally {
          setSaving(false);
      }
  };

  if (!nota) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Vincular ou Gerar Pedido de Compra</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border mb-4">
            <div>
                <Label className="text-xs text-muted-foreground">Nota Fiscal</Label>
                <div className="font-bold text-lg">{nota.numero_nfe}</div>
                <div className="text-sm text-muted-foreground">{getFornecedorName(nota.fornecedor_id)}</div>
                <div className="text-blue-600 font-mono font-bold">R$ {parseFloat(nota.valor_total).toFixed(2)}</div>
            </div>
            {selectedPedido ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                     <Label className="text-xs text-blue-600 dark:text-blue-400">Pedido Selecionado</Label>
                     <div className="font-bold text-lg">#{selectedPedido.numero || selectedPedido.id}</div>
                     <div className="text-sm text-muted-foreground">{getFornecedorName(selectedPedido.fornecedor_id)}</div>
                     <div className="text-muted-foreground font-mono">
                         R$ {parseFloat(selectedPedido.valor_total || 0).toFixed(2)}
                     </div>
                </div>
            ) : (
                <div className="flex items-center justify-center text-muted-foreground text-sm italic border border-dashed border-border rounded">
                    Nenhum pedido selecionado
                </div>
            )}
        </div>

        {/* Auto Generate Option */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center mb-6">
            <div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Não existe pedido para esta nota?
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Gere um pedido de compra automaticamente com os dados da nota.</p>
            </div>
            <Button size="sm" onClick={handleGerarAutomatico} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Gerar Pedido Automaticamente
            </Button>
        </div>

        <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase">Ou vincule existente</span>
            <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
            <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">SUGESTÕES ENCONTRADAS</Label>
                <div className="space-y-2">
                    {suggestions.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPedido(p)}
                            className={`
                                cursor-pointer p-3 rounded border transition-colors flex justify-between items-center
                                ${selectedPedido?.id === p.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-950/30 text-foreground' : 'bg-card border-border hover:bg-muted'}
                            `}
                        >
                             <div>
                                 <div className="font-bold flex items-center gap-2">
                                     #{p.numero || p.id}
                                     <Badge className="bg-green-500 text-white text-[10px]">Alta Probabilidade</Badge>
                                 </div>
                                 <div className="text-xs text-muted-foreground">Emissão: {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString() : '-'}</div>
                                 <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Building2 className="h-3 w-3" /> {getFornecedorName(p.fornecedor_id)}
                                 </div>
                             </div>
                             <div className="font-mono font-bold">
                                 R$ {parseFloat(p.valor_total || 0).toFixed(2)}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Search */}
        <div className="space-y-4">
            <Label className="text-xs text-muted-foreground">BUSCAR OUTROS PEDIDOS</Label>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Digite número, fornecedor ou valor..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-[200px]">
                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos Fornecedores</SelectItem>
                            {fornecedores.map(f => (
                                <SelectItem key={f.id} value={f.id}>{f.fantasia || f.nome}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <ScrollArea className="h-[200px] border border-border rounded-md p-2">
                {filteredPedidos.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Nenhum pedido encontrado para os filtros.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredPedidos.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedPedido(p)}
                                className={`
                                    cursor-pointer p-2 rounded border transition-colors flex justify-between items-center text-sm
                                    ${selectedPedido?.id === p.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-950/30 text-foreground' : 'bg-card border-border hover:bg-muted'}
                                `}
                            >
                                 <div className="flex flex-col">
                                     <span className="font-medium">#{p.numero || p.id}</span>
                                     <span className="text-xs text-muted-foreground">{getFornecedorName(p.fornecedor_id)}</span>
                                 </div>
                                 <span className="font-mono text-xs">
                                     R$ {parseFloat(p.valor_total || 0).toFixed(2)}
                                 </span>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleVincular}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!selectedPedido || saving}
          >
            <Link2 className="h-4 w-4" /> Vincular Selecionado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MatchingModal;
