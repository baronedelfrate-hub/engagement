import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calculator, DollarSign, Calendar, FileText, AlertTriangle, 
  CheckCircle2, Plus, Trash2, Building2, Receipt, PieChart, XCircle
} from 'lucide-react';

const FORMAS_PAGAMENTO = [
    { id: 'boleto', label: 'Boleto Bancário' },
    { id: 'ted', label: 'TED / DOC' },
    { id: 'pix', label: 'PIX' },
    { id: 'cartao_credito', label: 'Cartão de Crédito' },
    { id: 'dinheiro', label: 'Dinheiro' }
];

const RecebimentoNFeModal = ({ isOpen, onClose, nota, onConfirm }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dados');
  
  // Data
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [projetos, setProjetos] = useState([]);

  // State: Payments
  const [pagamentos, setPagamentos] = useState([]);
  const [newPagamento, setNewPagamento] = useState({ tipo: 'boleto', dataVencimento: '', valor: '', documento: '', obs: '' });

  // State: Allocation (Rateio)
  const [mainCategory, setMainCategory] = useState('');
  const [rateios, setRateios] = useState([]);
  const [newRateio, setNewRateio] = useState({ percentual: '', subcategoria_id: '', centro_custo_id: '', projeto_id: '' });

  // State: Discrepancies
  const [divergencias, setDivergencias] = useState([]);
  const [newDivergencia, setNewDivergencia] = useState({ tipo: 'Quantidade', descricao: '', justificativa: '' });

  useEffect(() => {
    if (isOpen && nota) {
        let catData = storage.get('CATEGORIAS') || [];
        setCategorias(catData);

        let subData = storage.get('SUBCATEGORIAS') || [];
        setSubcategorias(subData);

        let ccData = storage.get('CENTRO_CUSTOS') || [];
        setCentrosCusto(ccData);

        let projData = storage.get('PROJETOS') || [];
        setProjetos(projData);

        setProdutos(storage.get('PRODUTOS') || []);

        // Init Items
        const initialItems = (nota.itens || []).map(i => ({
            ...i,
            quantidade_recebida: i.quantidade,
            diferenca: 0
        }));
        setItems(initialItems);

        // Init Rateios if existing
        const existingRateios = (storage.get('NF_RATEIO') || []).filter(r => r.nota_id === nota.id);
        if (existingRateios.length > 0) {
            setRateios(existingRateios);
            if (nota.categoria_id) setMainCategory(nota.categoria_id);
        } else {
            setRateios([]);
            if (nota.categoria_id) setMainCategory(nota.categoria_id);
        }

        // Init Payments (default to 1 payment of total value if none exist)
        setPagamentos([{
            id: Date.now().toString(),
            tipo: 'boleto',
            dataVencimento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            valor: parseFloat(nota.valor_total),
            documento: '',
            obs: 'Pagamento integral'
        }]);

        setDivergencias([]);
        setActiveTab('dados');
    }
  }, [isOpen, nota]);

  // ... Handlers ...
  const handleAddPagamento = () => {
      if (!newPagamento.valor || !newPagamento.dataVencimento) {
          toast({ title: "Erro", description: "Valor e Data de Vencimento são obrigatórios.", variant: "destructive" });
          return;
      }
      setPagamentos([...pagamentos, { ...newPagamento, id: Date.now().toString(), valor: parseFloat(newPagamento.valor) }]);
      setNewPagamento({ tipo: 'boleto', dataVencimento: '', valor: '', documento: '', obs: '' });
  };

  const removePagamento = (id) => setPagamentos(pagamentos.filter(p => p.id !== id));

  const totalPagamentos = pagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
  const saldoPagamento = nota ? (parseFloat(nota.valor_total) - totalPagamentos) : 0;

  const handleAddRateio = () => {
      if (!newRateio.percentual || (!newRateio.subcategoria_id && !newRateio.centro_custo_id && !newRateio.projeto_id)) {
          toast({ title: "Incompleto", description: "Informe percentual e pelo menos uma classificação.", variant: "destructive" });
          return;
      }
      setRateios([...rateios, { ...newRateio, id: Date.now().toString(), percentual: parseFloat(newRateio.percentual) }]);
      setNewRateio({ percentual: '', subcategoria_id: '', centro_custo_id: '', projeto_id: '' });
  };

  const removeRateio = (id) => setRateios(rateios.filter(r => r.id !== id));
  
  const totalRateio = rateios.reduce((acc, r) => acc + parseFloat(r.percentual || 0), 0);

  const handleQtyChange = (id, newQty) => {
      const qty = parseFloat(newQty);
      setItems(items.map(i => {
          if (i.id === id) {
              const diff = qty - i.quantidade;
              return { ...i, quantidade_recebida: qty, diferenca: diff };
          }
          return i;
      }));
  };

  const handleConfirm = () => {
      // --- 2. CRITICAL FIX: Subcategory from Rateio ---
      const subcategoriaIdToSave = rateios[0]?.subcategoria_id || '';
      
      if (Math.abs(saldoPagamento) > 0.05) {
          toast({ title: "Erro Financeiro", description: `A soma dos pagamentos difere do total da nota em R$ ${saldoPagamento.toFixed(2)}`, variant: "destructive" });
          return;
      }
      
      if (rateios.length > 0 && Math.abs(totalRateio - 100) > 0.1) {
          toast({ title: "Erro Rateio", description: "A soma dos rateios deve ser 100%.", variant: "destructive" });
          return;
      }

      try {
          // ... Stock Entries ...
          const stockEntries = items.map(item => {
              const productMatch = produtos.find(p => 
                  (p.codigo && p.codigo === item.codigo) || 
                  (p.nome && p.nome.toLowerCase() === item.descricao.toLowerCase())
              );
              
              return {
                  id: storage.uuid(),
                  produtoId: productMatch ? productMatch.id : null,
                  produto_codigo: item.codigo,
                  descricao: item.descricao,
                  quantidade: parseFloat(item.quantidade_recebida),
                  valor_unitario: parseFloat(item.valorUnitario),
                  valor_total: parseFloat(item.valorTotal),
                  documentoOrigem: `NFe ${nota.numero}`,
                  data: new Date().toISOString().split('T')[0],
                  categoria_id: mainCategory,
                  centro_custo_id: rateios.length > 0 ? rateios[0].centro_custo_id : null,
                  nota_fiscal_id: nota.id,
                  criado_por: 'Sistema Recebimento',
                  criado_em: new Date().toISOString()
              };
          });

          stockEntries.forEach(entry => {
              storage.add('ENTRADA_ESTOQUE', entry);
              if (entry.produtoId) {
                  const prod = storage.getById('PRODUTOS', entry.produtoId);
                  if (prod) {
                      const currentStock = parseFloat(prod.estoque || 0);
                      storage.update('PRODUTOS', entry.produtoId, { estoque: currentStock + entry.quantidade });
                  }
              }
          });

          // ... Accounts Payable ...
          const finalParcelas = pagamentos.map((pag, idx) => ({
               id: storage.uuid(),
               numero: idx + 1,
               valor: parseFloat(pag.valor),
               dataVencimento: pag.dataVencimento,
               status: 'Pendente'
          }));

          const contaPagar = {
               id: storage.uuid(),
               numeroTitulo: nota.numero, 
               descricao: `NFe ${nota.numero} - ${nota.emitente_nome}`,
               fornecedorId: nota.fornecedor_id,
               fornecedorNome: nota.emitente_nome,
               valorTotal: parseFloat(nota.valor_total),
               dataVencimento: finalParcelas[0].dataVencimento, 
               dataEmissao: new Date().toISOString().split('T')[0],
               status: 'Pendente',
               
               categoriaId: mainCategory,
               subcategoriaId: subcategoriaIdToSave, // Ensure this is saved
               centroCustosId: rateios.length > 0 ? rateios[0].centro_custo_id : null,
               projetoId: rateios.length > 0 ? rateios[0].projeto_id : null,
               
               tipoDocumentoId: pagamentos.length > 0 ? pagamentos[0].tipo : null,
               nota_fiscal_id: nota.id,
               observacoes: 'Gerado via Recebimento NFe',
               rateios_snapshot: rateios,
               createdAt: new Date().toISOString(),
               parcelas: finalParcelas
          };
           
          // --- DEBUG LOG REQUESTED ---
          console.log('SALVANDO - subcategoriaId:', subcategoriaIdToSave);
          
          storage.add('CONTAS_PAGAR', contaPagar);

          // ... Save Rateios ...
          const allRateios = storage.get('NF_RATEIO') || [];
          const otherRateios = allRateios.filter(r => r.nota_id !== nota.id);
          const newRateioRecords = rateios.map(r => ({
              ...r,
              id: storage.uuid(),
              nota_id: nota.id,
              valor_rateado: (r.percentual / 100) * parseFloat(nota.valor_total),
              criado_em: new Date().toISOString()
          }));
          storage.set('NF_RATEIO', [...otherRateios, ...newRateioRecords]);

          // ... Discrepancies ...
          divergencias.forEach(d => {
              storage.add('NF_DIVERGENCIA', { ...d, nota_id: nota.id, data: new Date().toISOString() });
          });

          // ... Update Status ...
          storage.update('NOTAS_FISCAIS_ENTRADA', nota.id, {
              status: 'Concluida',
              data_entrada: new Date().toISOString(),
              categoria_id: mainCategory
          });
          
          toast({ 
              title: "Entrada Concluída", 
              description: "Estoque atualizado e Contas a Pagar geradas com sucesso!",
              className: "bg-green-600 text-white border-none"
          });
          
          onConfirm();
          onClose();

      } catch (error) {
          console.error("Erro na confirmação:", error);
          toast({ title: "Erro no Processamento", description: error.message, variant: "destructive" });
      }
  };

  if (!nota) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden p-0 bg-background text-foreground z-[9999] outline-none">
        <DialogHeader className="px-6 py-4 border-b border-border bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
              <Receipt className="h-5 w-5 text-blue-600" />
              Conferência e Entrada de Nota Fiscal
          </DialogTitle>
          <div className="text-sm text-muted-foreground flex gap-4 mt-1">
              <span>Nota: <strong className="text-foreground">{nota.numero}</strong></span>
              <span>Emitente: <strong className="text-foreground">{nota.emitente_nome}</strong></span>
              <span>Total: <strong className="text-emerald-600">R$ {parseFloat(nota.valor_total).toFixed(2)}</strong></span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 pt-4 bg-background border-b border-border sticky top-0 z-10">
                    <TabsList className="grid w-full grid-cols-6 mb-4 bg-muted">
                        <TabsTrigger value="dados" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Dados da Nota</TabsTrigger>
                        <TabsTrigger value="itens" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Itens & Estoque</TabsTrigger>
                        <TabsTrigger value="pagamentos" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Pagamentos</TabsTrigger>
                        <TabsTrigger value="classificacao" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Classificação</TabsTrigger>
                        <TabsTrigger value="divergencias" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Divergências</TabsTrigger>
                        <TabsTrigger value="resumo" className="data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Resumo Final</TabsTrigger>
                    </TabsList>
                </div>

                <div className="p-6">
                    {/* ... TABS CONTENT ... */}
                    <TabsContent value="dados" className="mt-0">
                        <div className="grid grid-cols-3 gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
                            <div>
                                <Label className="text-xs text-muted-foreground">Chave de Acesso</Label>
                                <div className="font-mono text-xs truncate text-foreground" title={nota.chave_nfe}>{nota.chave_nfe || '-'}</div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Série</Label>
                                <div className="text-foreground">{nota.serie}</div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Data Emissão</Label>
                                <div className="text-foreground">{new Date(nota.data_emissao).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">CNPJ Emitente</Label>
                                <div className="text-foreground">{nota.emitente_cnpj}</div>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs text-muted-foreground">Origem</Label>
                                <Badge variant="outline" className="text-muted-foreground bg-muted border-border">{nota.origem}</Badge>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="itens" className="mt-0">
                        <div className="bg-background rounded-lg border border-border shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted border-b border-border text-foreground">
                                    <tr>
                                        <th className="text-left p-3 font-semibold w-[100px]">Código</th>
                                        <th className="text-left p-3 font-semibold">Descrição</th>
                                        <th className="text-right p-3 font-semibold">Qtd XML</th>
                                        <th className="text-right p-3 font-semibold w-[120px]">Qtd Recebida</th>
                                        <th className="text-right p-3 font-semibold">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {items.map((item) => (
                                        <tr key={item.id} className={`${item.diferenca !== 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''} hover:bg-muted text-foreground`}>
                                            <td className="font-mono text-xs p-3 text-muted-foreground">{item.codigo}</td>
                                            <td className="text-xs p-3">{item.descricao}</td>
                                            <td className="text-right p-3">{item.quantidade}</td>
                                            <td className="p-3">
                                                <Input 
                                                    type="number" 
                                                    className={`h-8 text-right bg-background border-border text-foreground ${item.diferenca !== 0 ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' : ''}`}
                                                    value={item.quantidade_recebida}
                                                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="text-right font-bold p-3">R$ {item.valorTotal?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="pagamentos" className="mt-0 space-y-4">
                        <div className="grid grid-cols-12 gap-2 items-end bg-background p-4 rounded-lg border border-border">
                            <div className="col-span-3">
                                <Label className="text-foreground">Tipo</Label>
                                <Select value={newPagamento.tipo} onValueChange={(v) => setNewPagamento({...newPagamento, tipo: v})}>
                                    <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-background border-border z-[10002]">
                                        {FORMAS_PAGAMENTO.map(f => <SelectItem key={f.id} value={f.id} className="text-foreground">{f.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3">
                                <Label className="text-foreground">Vencimento</Label>
                                <Input type="date" className="bg-background border-border text-foreground" value={newPagamento.dataVencimento} onChange={(e) => setNewPagamento({...newPagamento, dataVencimento: e.target.value})} />
                            </div>
                            <div className="col-span-3">
                                <Label className="text-foreground">Valor (R$)</Label>
                                <Input type="number" className="bg-background border-border text-foreground" value={newPagamento.valor} onChange={(e) => setNewPagamento({...newPagamento, valor: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-foreground">Doc. Num</Label>
                                <Input className="bg-background border-border text-foreground" value={newPagamento.documento} onChange={(e) => setNewPagamento({...newPagamento, documento: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <Button onClick={handleAddPagamento} size="icon" className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>
                         <div className="space-y-2">
                            {pagamentos.map((pag) => (
                                <div key={pag.id} className="flex items-center justify-between bg-background p-3 rounded border border-border shadow-sm">
                                    <div className="flex gap-4 items-center">
                                        <Badge variant="secondary" className="uppercase bg-muted text-foreground border-border">{pag.tipo}</Badge>
                                        <span className="font-bold text-sm text-foreground">{new Date(pag.dataVencimento).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-lg text-foreground">R$ {pag.valor.toFixed(2)}</span>
                                        <Button variant="ghost" size="icon" onClick={() => removePagamento(pag.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="classificacao" className="mt-0 space-y-4">
                        <div className="bg-background p-4 rounded-lg border border-border">
                            <Label className="text-foreground">Categoria Principal</Label>
                            <Select value={mainCategory} onValueChange={setMainCategory}>
                                <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione a Categoria Macro..." /></SelectTrigger>
                                <SelectContent className="bg-background border-border z-[10002]">
                                    {categorias.map(c => <SelectItem key={c.id} value={c.id} className="text-foreground">{c.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-muted p-4 rounded-lg border border-border">
                             <div className="grid grid-cols-12 gap-2 items-end mb-4">
                                <div className="col-span-2">
                                    <Label className="text-foreground">Percentual %</Label>
                                    <Input type="number" placeholder="%" className="bg-background border-border text-foreground" value={newRateio.percentual} onChange={(e) => setNewRateio({...newRateio, percentual: e.target.value})} />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-foreground">Subcategoria</Label>
                                    <Select value={newRateio.subcategoria_id} onValueChange={(v) => setNewRateio({...newRateio, subcategoria_id: v})}>
                                        <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent className="bg-background border-border z-[10002]">
                                            {subcategorias.map(s => <SelectItem key={s.id} value={s.id} className="text-foreground">{s.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-foreground">Centro de Custo</Label>
                                    <Select value={newRateio.centro_custo_id} onValueChange={(v) => setNewRateio({...newRateio, centro_custo_id: v})}>
                                        <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent className="bg-background border-border z-[10002]">
                                            {centrosCusto.map(c => <SelectItem key={c.id} value={c.id} className="text-foreground">{c.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-foreground">Projeto</Label>
                                    <Select value={newRateio.projeto_id} onValueChange={(v) => setNewRateio({...newRateio, projeto_id: v})}>
                                        <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent className="bg-background border-border z-[10002]">
                                            {projetos.map(p => <SelectItem key={p.id} value={p.id} className="text-foreground">{p.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1">
                                    <Button onClick={handleAddRateio} size="icon" className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            
                             <div className="space-y-2">
                                {rateios.map(r => (
                                    <div key={r.id} className="flex items-center justify-between bg-background p-2 rounded border border-border text-sm text-foreground">
                                        <div className="flex gap-2 items-center">
                                            <Badge variant="outline" className="bg-blue-50 font-bold w-16 justify-center text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">{r.percentual}%</Badge>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{centrosCusto.find(c => c.id === r.centro_custo_id)?.nome || 'CC Padrão'}</span>
                                                <span className="text-xs text-muted-foreground">{subcategorias.find(s => s.id === r.subcategoria_id)?.nome || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-muted-foreground">
                                                R$ {((parseFloat(r.percentual)/100) * parseFloat(nota.valor_total)).toFixed(2)}
                                            </span>
                                            <Button variant="ghost" size="sm" onClick={() => removeRateio(r.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="divergencias" className="mt-0">
                         <div className="bg-background p-4 rounded-lg border border-border space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-foreground">Tipo</Label>
                                    <Select value={newDivergencia.tipo} onValueChange={(v) => setNewDivergencia({...newDivergencia, tipo: v})}>
                                        <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-background border-border z-[10002]">
                                            <SelectItem value="Quantidade" className="text-foreground">Quantidade</SelectItem>
                                            <SelectItem value="Valor" className="text-foreground">Valor</SelectItem>
                                            <SelectItem value="Qualidade/Avaria" className="text-foreground">Qualidade/Avaria</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="resumo" className="mt-0">
                        <div className="grid grid-cols-2 gap-6">
                             <div className="bg-muted p-4 rounded-lg border border-border">
                                    <h4 className="font-bold mb-2 text-foreground">Totais da Nota</h4>
                                    <div className="flex justify-between py-1 border-b border-border text-foreground">
                                        <span>Valor Bruto</span>
                                        <span>R$ {parseFloat(nota.valor_total).toFixed(2)}</span>
                                    </div>
                             </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        <DialogFooter className="bg-background p-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
                onClick={handleConfirm} 
                className="gap-2 bg-green-600 hover:bg-green-700 min-w-[150px] text-white"
                disabled={Math.abs(saldoPagamento) > 0.05}
            >
                <CheckCircle2 className="h-4 w-4" /> Confirmar Entrada
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecebimentoNFeModal;