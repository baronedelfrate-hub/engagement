import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, FileText, MessageSquare, Box, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { generatePDF, generateWhatsAppLink } from '@/lib/documents';
import RecebimentoModal from './components/RecebimentoModal';

function PedidosCompraForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  
  // Master Data
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [condicoesPagamento, setCondicoesPagamento] = useState([]);
  const [centroCustos, setCentroCustos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isRecebimentoOpen, setIsRecebimentoOpen] = useState(false);

  const [formData, setFormData] = useState({
    numeroPedido: '',
    fornecedorId: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataEntrega: '',
    condicaoPagamentoId: '',
    centroCustosId: '',
    categoriaId: '',
    subcategoriaId: '',
    projeto: '',
    observacoes: '',
    status: 'Aberto',
    divergencias: [],
    itens: []
  });

  useEffect(() => {
    const loadInitialData = () => {
      try {
        setFornecedores(storage.get('FORNECEDORES') || []);
        setProdutos(storage.get('PRODUTOS') || []);
        setServicos(storage.get('SERVICOS') || []);
        setCondicoesPagamento(storage.get('CONDICAO_PAGAMENTO') || []);
        setCentroCustos(storage.get('CENTRO_CUSTOS') || []);
        setCategorias(storage.get('CATEGORIAS') || []);
        setSubcategorias(storage.get('SUBCATEGORIAS') || []);

        if (id) {
          console.log('Loading Purchase Order ID:', id);
          const pedido = storage.getById('PEDIDOS_COMPRA', id);
          if (pedido) {
            setFormData({
                ...pedido,
                status: pedido.status || 'Aberto',
                divergencias: pedido.divergencias || []
            });
          } else {
            setError("Pedido de compra não encontrado.");
            toast({title: "Erro", description: "Pedido de compra não encontrado.", variant: "destructive"});
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
        setError("Erro ao carregar dados: " + e.message);
        toast({title: "Erro", description: "Erro ao carregar dados.", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [id, toast]);

  const getFornecedorName = (id) => {
    const f = fornecedores.find(item => item.id === id);
    return f ? f.nome : 'Fornecedor';
  };

  const handlePDF = () => {
    try {
      generatePDF('Pedido Compra', formData, getFornecedorName(formData.fornecedorId));
      toast({ title: "PDF Gerado", description: "O download iniciará em instantes." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao gerar PDF", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    try {
      const link = generateWhatsAppLink('Pedido Compra', formData, getFornecedorName(formData.fornecedorId));
      window.open(link, '_blank');
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao gerar link WhatsApp", variant: "destructive" });
    }
  };

  const handleRecebimento = (itemsReceived) => {
    try {
      const updatedItens = formData.itens.map((item, index) => {
          const receivedItem = itemsReceived[index];
          return {
              ...item,
              quantidadeRecebida: (item.quantidadeRecebida || 0) + (receivedItem.receberAgora || 0)
          };
      });

      const newDivergencias = itemsReceived
          .filter(item => item.divergencia)
          .map(item => ({
              itemId: item.itemId,
              data: new Date().toISOString(),
              justificativa: item.justificativa
          }));

      const allFullyReceived = updatedItens.every(item => item.quantidadeRecebida >= item.quantidade);
      const someReceived = updatedItens.some(item => item.quantidadeRecebida > 0);
      const newStatus = allFullyReceived ? 'Recebido' : (someReceived ? 'Parcialmente Recebido' : 'Aberto');

      const updatedPedido = {
          ...formData,
          itens: updatedItens,
          status: newStatus,
          divergencias: [...formData.divergencias, ...newDivergencias]
      };

      setFormData(updatedPedido);
      storage.update('PEDIDOS_COMPRA', id, updatedPedido);

      itemsReceived.forEach(item => {
          if (item.receberAgora > 0 && item.tipo === 'produto') {
              storage.add('ENTRADA_ESTOQUE', {
                  produtoId: item.itemId,
                  quantidade: item.receberAgora,
                  data: new Date().toISOString().split('T')[0],
                  documentoOrigem: `Pedido #${formData.numeroPedido || id}`
              });
              
              const product = produtos.find(p => p.id === item.itemId);
              if (product) {
                  storage.update('PRODUTOS', product.id, {
                      estoque: parseFloat(product.estoque || 0) + parseFloat(item.receberAgora)
                  });
              }
          }
      });

      toast({ title: "Recebimento Registrado", description: "Estoque atualizado com sucesso." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao registrar recebimento", variant: "destructive" });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      itens: [
        ...formData.itens,
        {
          id: Date.now(),
          tipo: 'produto',
          itemId: '',
          quantidade: 1,
          quantidadeRecebida: 0,
          valorUnitario: 0,
          valorTotal: 0
        }
      ]
    });
  };

  const removeItem = (index) => {
    const newItens = [...formData.itens];
    newItens.splice(index, 1);
    setFormData({ ...formData, itens: newItens });
  };

  const updateItem = (index, field, value) => {
    const newItens = [...formData.itens];
    const item = newItens[index];
    item[field] = value;

    if (field === 'tipo') {
        item.itemId = '';
        item.valorUnitario = 0;
    }

    if (field === 'itemId') {
        const source = item.tipo === 'produto' ? produtos : servicos;
        const selected = source.find(s => s.id === value);
        if (selected) {
            const price = item.tipo === 'produto' ? (selected.custo || 0) : (selected.valor || 0);
            item.valorUnitario = price;
        }
    }

    item.valorTotal = item.quantidade * item.valorUnitario;
    setFormData({ ...formData, itens: newItens });
  };

  const calculateTotal = () => {
    return formData.itens.reduce((acc, item) => acc + parseFloat(item.valorTotal || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fornecedorId) {
        toast({ title: "Erro", description: "Selecione um fornecedor.", variant: "destructive" });
        return;
    }

    try {
      const pedidoToSave = { ...formData };
      if (!id) {
          if (!pedidoToSave.numeroPedido) {
              pedidoToSave.numeroPedido = `PC-${Date.now().toString().slice(-6)}`;
          }
          storage.add('PEDIDOS_COMPRA', pedidoToSave);
          toast({ title: "Pedido criado", description: "O novo pedido de compra foi cadastrado com sucesso." });
      } else {
        storage.update('PEDIDOS_COMPRA', id, pedidoToSave);
        toast({ title: "Pedido atualizado", description: "Os dados do pedido de compra foram atualizados com sucesso." });
      }
      navigate('/compras/pedidos');
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar o pedido.", variant: "destructive" });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] animate-in fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Carregando dados do pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] text-destructive animate-in fade-in">
          <AlertTriangle className="h-16 w-16 mb-6 opacity-80" />
          <h3 className="text-2xl font-bold mb-2">Erro ao Carregar</h3>
          <p className="text-lg mb-6 opacity-90">{error}</p>
          <Button onClick={() => navigate('/compras/pedidos')} variant="outline">
              Voltar para Lista
          </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <Helmet>
        <title>{id ? 'Editar' : 'Novo'} Pedido de Compra - ERP Platform</title>
      </Helmet>

      <PageHeader
        title={id ? `Pedido de Compra #${formData.numeroPedido || id.slice(0,8)}` : 'Novo Pedido de Compra'}
        description={`Gerencie os detalhes deste pedido. Status atual: ${formData.status}`}
        showBack
        action={id && (
            <div className="flex gap-2">
                {formData.status !== 'Recebido' && formData.status !== 'Cancelado' && (
                    <Button onClick={() => setIsRecebimentoOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Box className="h-4 w-4" /> Receber Itens
                    </Button>
                )}
                <Button variant="outline" onClick={handlePDF} className="gap-2">
                    <FileText className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" onClick={handleWhatsApp} className="gap-2">
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                </Button>
            </div>
        )}
      />

      <RecebimentoModal 
        isOpen={isRecebimentoOpen} 
        onClose={() => setIsRecebimentoOpen(false)}
        pedido={formData}
        onSave={handleRecebimento}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dados Principais</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="numeroPedido">Número do Pedido *</Label>
                            <Input
                                id="numeroPedido"
                                name="numeroPedido"
                                value={formData.numeroPedido}
                                onChange={handleChange}
                                placeholder="Ex: PO-2025-001"
                                required
                                className="bg-background text-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fornecedorId">Fornecedor *</Label>
                            <select
                                id="fornecedorId"
                                name="fornecedorId"
                                value={formData.fornecedorId}
                                onChange={handleChange}
                                required
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dataEmissao">Data de Emissão *</Label>
                            <Input
                                id="dataEmissao"
                                name="dataEmissao"
                                type="date"
                                value={formData.dataEmissao}
                                onChange={handleChange}
                                required
                                className="bg-background text-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dataEntrega">Previsão de Entrega</Label>
                            <Input
                                id="dataEntrega"
                                name="dataEntrega"
                                type="date"
                                value={formData.dataEntrega}
                                onChange={handleChange}
                                className="bg-background text-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="condicaoPagamentoId">Condição de Pagamento</Label>
                            <select
                                id="condicaoPagamentoId"
                                name="condicaoPagamentoId"
                                value={formData.condicaoPagamentoId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {condicoesPagamento.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="projeto">Projeto</Label>
                            <Input
                                id="projeto"
                                name="projeto"
                                value={formData.projeto}
                                onChange={handleChange}
                                className="bg-background text-foreground"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Classificação Financeira</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="centroCustosId">Centro de Custos</Label>
                            <select
                                id="centroCustosId"
                                name="centroCustosId"
                                value={formData.centroCustosId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {centroCustos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoriaId">Categoria</Label>
                            <select
                                id="categoriaId"
                                name="categoriaId"
                                value={formData.categoriaId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subcategoriaId">Subcategoria</Label>
                            <select
                                id="subcategoriaId"
                                name="subcategoriaId"
                                value={formData.subcategoriaId}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {subcategorias
                                    .filter(s => !formData.categoriaId || s.categoriaPai === categorias.find(c => c.id === formData.categoriaId)?.nome)
                                    .map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Itens do Pedido</CardTitle>
                    <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Item
                    </Button>
                </CardHeader>
                <CardContent>
                    {formData.itens.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                            <p className="text-muted-foreground">Nenhum item adicionado ao pedido.</p>
                            <Button type="button" onClick={addItem} variant="link" className="mt-2">Adicionar o primeiro item</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {formData.itens.map((item, index) => (
                                <div key={item.id || index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-border pb-4 last:border-0 last:pb-0">
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs">Tipo</Label>
                                        <select
                                            value={item.tipo}
                                            onChange={(e) => updateItem(index, 'tipo', e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                        >
                                            <option value="produto">Produto</option>
                                            <option value="servico">Serviço</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-4 space-y-1">
                                        <Label className="text-xs">Item</Label>
                                        <select
                                            value={item.itemId}
                                            onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {(item.tipo === 'produto' ? produtos : servicos).map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs">Qtd</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantidade}
                                            onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value))}
                                            className="h-9 bg-background text-foreground"
                                        />
                                        {item.quantidadeRecebida > 0 && (
                                            <span className="text-[10px] text-green-600 font-medium">Recebido: {item.quantidadeRecebida}</span>
                                        )}
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs">Valor Unit.</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={item.valorUnitario}
                                            onChange={(e) => updateItem(index, 'valorUnitario', parseFloat(e.target.value))}
                                            className="h-9 bg-background text-foreground"
                                        />
                                    </div>
                                    <div className="md:col-span-1 space-y-1">
                                        <Label className="text-xs">Total</Label>
                                        <div className="h-9 flex items-center font-bold text-sm text-foreground">
                                            R$ {parseFloat(item.valorTotal || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="md:col-span-1">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeItem(index)}
                                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end pt-4 border-t border-border mt-4">
                                <div className="text-xl font-bold text-foreground bg-muted/50 px-4 py-2 rounded">
                                    Total Geral: R$ {calculateTotal().toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {formData.divergencias && formData.divergencias.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50 shadow-none dark:bg-yellow-900/20 dark:border-yellow-900/50">
                    <CardHeader className="border-yellow-100 dark:border-yellow-900/30 pb-2">
                        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 text-base">
                            <AlertTriangle className="h-5 w-5" /> Divergências Registradas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-yellow-900 dark:text-yellow-300 pt-0">
                        <ul className="space-y-2 text-sm mt-2">
                            {formData.divergencias.map((div, i) => (
                                <li key={i} className="flex gap-2 items-start">
                                    <span className="font-medium whitespace-nowrap text-yellow-800 dark:text-yellow-400">{new Date(div.data).toLocaleDateString()}:</span>
                                    <span>{div.justificativa}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                            id="observacoes"
                            name="observacoes"
                            value={formData.observacoes}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Adicione observações adicionais sobre o pedido..."
                            className="bg-background text-foreground"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-3 justify-end sticky bottom-6 bg-background/90 backdrop-blur-sm p-4 rounded-lg border border-border shadow-lg z-10">
                <Button type="button" variant="outline" onClick={() => navigate('/compras/pedidos')}>
                    Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]">
                    {id ? 'Atualizar Pedido' : 'Finalizar Pedido'}
                </Button>
            </div>
        </form>
      </motion.div>
    </div>
  );
}

export default PedidosCompraForm;