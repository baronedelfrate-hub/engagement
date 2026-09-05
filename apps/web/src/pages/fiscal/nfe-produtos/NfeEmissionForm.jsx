import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Plus, Trash2, Save, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { nfeService } from './services/nfeService';
import { calculateTotals, validateNfeData, validateProducts } from './utils/nfeValidation';
import { formatCurrency } from './utils/nfeFormatting';
import { pullPedidoData } from './integrations/pedidoIntegration';
import { ConfirmActionDialog } from './components/NfeActionModals';

const INITIAL_STATE = {
  empresa_id: '', cliente_id: '', pedido_venda_id: '', numero: '', serie: '1',
  data_emissao: new Date().toISOString().split('T')[0], natureza_operacao: 'Venda de Mercadorias', cfop: '5102',
  condicao_pagamento_id: '', forma_pagamento_id: '', observacoes: '', status: 'Em digitação'
};

export default function NfeEmissionForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const pedidoIdUrl = searchParams.get('pedido_id');
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, total_descontos: 0, total_impostos: 0, valor_total: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  
  const [showPullConfirm, setShowPullConfirm] = useState(false);
  const [selectedPedidoToPull, setSelectedPedidoToPull] = useState('');

  const [empresas, setEmpresas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [condicoes, setCondicoes] = useState([]);
  const [formas, setFormas] = useState([]);

  useEffect(() => {
    fetchDropdowns();
    if (isEdit) {
      loadNfe();
    } else if (pedidoIdUrl) {
      handleAutoPullPedido(pedidoIdUrl);
    }
  }, [id, pedidoIdUrl]);

  useEffect(() => {
    setTotals(calculateTotals(items));
  }, [items]);

  const fetchDropdowns = async () => {
    try {
      const [emp, cli, ped, prod, cond, form] = await Promise.all([
        supabase.from('empresas').select('id, razao_social').eq('ativo', true),
        supabase.from('clientes').select('id, nome'),
        supabase.from('pedidos_venda').select('id, numero'),
        supabase.from('produtos').select('id, nome, preco_venda, ncm').eq('status', 'Ativo'),
        supabase.from('condicoes_pagamento').select('id, nome').eq('ativo', true),
        supabase.from('tipos_pagamento').select('id, nome').eq('ativo', true)
      ]);

      [
        ['empresas', emp], ['clientes', cli], ['pedidos_venda', ped],
        ['produtos', prod], ['condicoes_pagamento', cond], ['tipos_pagamento', form]
      ].forEach(([label, res]) => {
        if (res.error) console.error(`[NfeEmissionForm] Erro ao carregar ${label}:`, res.error);
      });

      setEmpresas(emp.data || []);
      setClientes(cli.data || []);
      setPedidos(ped.data || []);
      setProdutos(prod.data || []);
      setCondicoes(cond.data || []);
      setFormas(form.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoPullPedido = async (pedId) => {
    setLoading(true);
    try {
      const pedData = await pullPedidoData(pedId);
      if (pedData) {
        setFormData(p => ({
          ...p,
          pedido_venda_id: pedId,
          cliente_id: pedData.cliente_id || p.cliente_id,
          empresa_id: pedData.empresa_id || p.empresa_id,
          condicao_pagamento_id: pedData.condicao_pagamento_id || p.condicao_pagamento_id,
          observacoes: pedData.observacoes || p.observacoes
        }));
        setItems(pedData.itens || []);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar dados do pedido.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadNfe = async () => {
    setLoading(true);
    try {
      const data = await nfeService.fetchNfeDetail(id);
      setFormData({
        empresa_id: data.empresa_id || '',
        cliente_id: data.cliente_id || '',
        pedido_venda_id: data.pedido_venda_id || '',
        numero: data.numero || '',
        serie: data.serie || '',
        data_emissao: data.data_emissao || '',
        natureza_operacao: data.natureza_operacao || '',
        cfop: data.cfop || '',
        condicao_pagamento_id: data.condicao_pagamento_id || '',
        forma_pagamento_id: data.forma_pagamento_id || '',
        observacoes: data.observacoes || '',
        status: data.status || 'Em digitação'
      });
      setItems(data.itens || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao carregar NF-e', variant: 'destructive' });
      navigate('/fiscal/nfe-produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleAddItem = () => {
    setItems(p => [...p, { id: crypto.randomUUID(), produto_id: '', quantidade: 1, valor_unitario: 0, desconto: 0, impostos: 0, cfop: formData.cfop || '', ncm: '' }]);
  };

  const handleItemChange = (idx, field, val) => {
    const newItems = [...items];
    newItems[idx][field] = val;
    
    if (field === 'produto_id') {
      const prod = produtos.find(p => p.id === val);
      if (prod) {
        newItems[idx].valor_unitario = prod.preco_venda || 0;
        newItems[idx].ncm = prod.ncm || '';
      }
    }

    if (['quantidade', 'valor_unitario', 'desconto', 'impostos'].includes(field)) {
      const q = parseFloat(newItems[idx].quantidade) || 0;
      const vu = parseFloat(newItems[idx].valor_unitario) || 0;
      const d = parseFloat(newItems[idx].desconto) || 0;
      const i = parseFloat(newItems[idx].impostos) || 0;
      newItems[idx].valor_total = (q * vu) - d + i;
    }

    setItems(newItems);
  };

  const handleRemoveItem = (idx) => {
    setItems(p => p.filter((_, i) => i !== idx));
  };

  const handlePullPedido = async () => {
    setPulling(true);
    try {
      const pedData = await pullPedidoData(selectedPedidoToPull);
      if (pedData) {
        setFormData(p => ({
          ...p,
          pedido_venda_id: selectedPedidoToPull,
          cliente_id: pedData.cliente_id || p.cliente_id,
          empresa_id: pedData.empresa_id || p.empresa_id,
          condicao_pagamento_id: pedData.condicao_pagamento_id || p.condicao_pagamento_id,
          observacoes: pedData.observacoes || p.observacoes
        }));
        setItems(pedData.itens || []);
        toast({ title: 'Sucesso', description: 'Dados do pedido carregados.' });
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar dados do pedido.', variant: 'destructive' });
    } finally {
      setPulling(false);
      setShowPullConfirm(false);
    }
  };

  const onPedidoSelect = (val) => {
    setSelectedPedidoToPull(val);
    if (val && items.length === 0) {
      setShowPullConfirm(true);
    } else {
      handleChange('pedido_venda_id', val);
    }
  };

  const handleSave = async () => {
    const errs1 = validateNfeData(formData);
    const errs2 = validateProducts(items);
    const allErrs = [...errs1, ...errs2];

    if (allErrs.length > 0) {
      toast({ title: 'Verifique os erros:', description: allErrs.join('\n'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        subtotal: totals.subtotal,
        total_descontos: totals.total_descontos,
        total_impostos: totals.total_impostos,
        valor_total: totals.valor_total
      };

      let idToNav;
      if (isEdit) {
        idToNav = await nfeService.updateNfe(id, payload, items, null);
        toast({ title: 'Sucesso', description: 'NF-e atualizada.' });
      } else {
        const nfe = await nfeService.createNfe(payload, items, null);
        idToNav = nfe.id;
        toast({ title: 'Sucesso', description: 'NF-e criada.' });
      }
      navigate(`/fiscal/nfe-produtos/${idToNav}`);
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Helmet><title>{isEdit ? 'Editar NF-e' : 'Nova NF-e'} | ERP Platform</title></Helmet>
      
      <div className="flex justify-between items-center">
        <PageHeader 
          title={isEdit ? `Editar NF-e ${formData.numero}` : "Nova NF-e (Produtos)"}
          description="Preencha os dados para emissão da nota fiscal de produto."
          icon={FileText}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'NF-e Produtos', href: '/fiscal/nfe-produtos' },
            { label: isEdit ? 'Editar' : 'Nova' }
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/nfe-produtos')}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? 'Salvar Alterações' : 'Salvar Nota'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">1. Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Empresa Emitente *</Label>
                <Select value={formData.empresa_id} onValueChange={v => handleChange('empresa_id', v)}>
                  <SelectTrigger className="text-slate-900"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select value={formData.cliente_id} onValueChange={v => handleChange('cliente_id', v)}>
                  <SelectTrigger className="text-slate-900"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Vincular Pedido de Venda</Label>
                <div className="flex gap-2">
                  <Select value={formData.pedido_venda_id} onValueChange={onPedidoSelect}>
                    <SelectTrigger className="flex-1 text-slate-900"><SelectValue placeholder="Opcional..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pedidos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formData.pedido_venda_id && formData.pedido_venda_id !== 'none' && (
                    <Button variant="outline" size="icon" onClick={() => setShowPullConfirm(true)} title="Puxar Dados">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Data de Emissão *</Label>
                <Input type="date" value={formData.data_emissao} onChange={e => handleChange('data_emissao', e.target.value)} className="text-slate-900" />
              </div>
              <div className="space-y-1">
                <Label>Número da Nota</Label>
                <Input value={formData.numero} onChange={e => handleChange('numero', e.target.value)} placeholder="Auto se vazio" className="text-slate-900" />
              </div>
              <div className="space-y-1">
                <Label>Série</Label>
                <Input value={formData.serie} onChange={e => handleChange('serie', e.target.value)} className="text-slate-900" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">2. Operação</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label>Natureza da Operação *</Label>
                  <Input value={formData.natureza_operacao} onChange={e => handleChange('natureza_operacao', e.target.value)} className="text-slate-900" />
                </div>
                <div className="space-y-1">
                  <Label>CFOP Padrão</Label>
                  <Input value={formData.cfop} onChange={e => handleChange('cfop', e.target.value)} className="text-slate-900" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="py-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-semibold text-slate-800">3. Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label>Condição de Pagamento</Label>
                  <Select value={formData.condicao_pagamento_id} onValueChange={v => handleChange('condicao_pagamento_id', v)}>
                    <SelectTrigger className="text-slate-900"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.forma_pagamento_id} onValueChange={v => handleChange('forma_pagamento_id', v)}>
                    <SelectTrigger className="text-slate-900"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {formas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center">
              <CardTitle className="text-base font-semibold text-slate-800">4. Produtos</CardTitle>
              <Button size="sm" onClick={handleAddItem} variant="outline" className="h-8">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium min-w-[200px]">Produto</th>
                    <th className="pb-2 font-medium w-24">NCM</th>
                    <th className="pb-2 font-medium w-24">CFOP</th>
                    <th className="pb-2 font-medium w-20 text-right">Qtd</th>
                    <th className="pb-2 font-medium w-28 text-right">V. Unit</th>
                    <th className="pb-2 font-medium w-24 text-right">Desc.</th>
                    <th className="pb-2 font-medium w-24 text-right">Impostos</th>
                    <th className="pb-2 font-medium w-32 text-right">Total</th>
                    <th className="pb-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-6 text-slate-400">Nenhum produto adicionado.</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 pr-2">
                          <Select value={item.produto_id} onValueChange={v => handleItemChange(idx, 'produto_id', v)}>
                            <SelectTrigger className="h-8 text-xs text-slate-900">
                              <SelectValue placeholder="Selecione">
                                {item.descricao && !item.produto_id ? item.descricao : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {item.descricao && !item.produto_id && <SelectItem value={item.produto_id || 'custom'}>{item.descricao}</SelectItem>}
                              {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2"><Input value={item.ncm} readOnly className="h-8 text-xs bg-slate-50" /></td>
                        <td className="py-2 pr-2"><Input value={item.cfop} onChange={e => handleItemChange(idx, 'cfop', e.target.value)} className="h-8 text-xs text-slate-900" /></td>
                        <td className="py-2 pr-2"><Input type="number" min="1" step="any" value={item.quantidade} onChange={e => handleItemChange(idx, 'quantidade', e.target.value)} className="h-8 text-xs text-right text-slate-900" /></td>
                        <td className="py-2 pr-2"><Input type="number" min="0" step="any" value={item.valor_unitario || item.preco_unitario} onChange={e => handleItemChange(idx, 'valor_unitario', e.target.value)} className="h-8 text-xs text-right text-slate-900" /></td>
                        <td className="py-2 pr-2"><Input type="number" min="0" step="any" value={item.desconto} onChange={e => handleItemChange(idx, 'desconto', e.target.value)} className="h-8 text-xs text-right text-slate-900" /></td>
                        <td className="py-2 pr-2"><Input type="number" min="0" step="any" value={item.impostos} onChange={e => handleItemChange(idx, 'impostos', e.target.value)} className="h-8 text-xs text-right text-slate-900" /></td>
                        <td className="py-2 text-right font-medium text-slate-800 pr-2">{formatCurrency(item.valor_total)}</td>
                        <td className="py-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 border-t-4 border-t-emerald-500">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">Totalizadores</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal Produtos</span>
                <span className="font-medium text-slate-800">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Descontos</span>
                <span className="font-medium text-red-600">- {formatCurrency(totals.total_descontos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Impostos</span>
                <span className="font-medium text-slate-800">+ {formatCurrency(totals.total_impostos)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-800">Valor Total NF-e</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(totals.valor_total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">Status & Observações</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label>Status da NF-e</Label>
                <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                  <SelectTrigger className="text-slate-900 font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em digitação">Em digitação</SelectItem>
                    <SelectItem value="Aguardando emissão">Aguardando emissão</SelectItem>
                    {isEdit && <SelectItem value="Cancelada">Cancelada</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Observações Gerais</Label>
                <Textarea 
                  value={formData.observacoes} 
                  onChange={e => handleChange('observacoes', e.target.value)} 
                  className="min-h-[120px] text-slate-900 text-sm"
                  placeholder="Informações adicionais para o DANFE..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmActionDialog 
        isOpen={showPullConfirm} 
        onClose={() => setShowPullConfirm(false)} 
        onConfirm={handlePullPedido}
        title="Puxar Dados do Pedido"
        description="Deseja preencher os dados desta NF-e (cliente, produtos, condições) com base no pedido selecionado? Isso substituirá os itens atuais."
        loading={pulling}
      />
    </div>
  );
}