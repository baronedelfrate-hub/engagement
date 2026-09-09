import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';
import { Save, X, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PedidoVendaItensSection from './components/PedidoVendaItensSection';
import TotalizadoresSection from './components/TotalizadoresSection';
import { useConversaoOrcamento } from '@/hooks/useConversaoOrcamento';
import ConversaoDialog from '@/components/ConversaoDialog';
import ConversaoHistorico from '@/components/ConversaoHistorico';

const OrcamentosForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState([]);
    
    const [orcamento, setOrcamento] = useState({
        numero: `ORC-${Date.now().toString().slice(-6)}`,
        data_emissao: new Date().toISOString().split('T')[0],
        data_validade: '',
        status: 'rascunho',
        cliente_id: '',
        observacoes: ''
    });
    
    const [itens, setItens] = useState([]);

    const { podeConverterOrcamento, converterOrcamentoParaPedido, isConverting } = useConversaoOrcamento();
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        const fetchDependencies = async () => {
            const { data: cData } = await supabase.from('clientes').select('id, nome');
            if (cData) setClientes(cData);

            if (id) {
                setLoading(true);
                const { data: oData } = await supabase.from('orcamentos').select('*').eq('id', id).single();
                if (oData) setOrcamento(oData);
                
                const { data: iData } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id);
                if (iData) setItens(iData);
                setLoading(false);
            }
        };
        fetchDependencies();
    }, [id]);

    const handleFieldChange = (key, val) => {
        setOrcamento(prev => ({ ...prev, [key]: val }));
    };

    const calculateOverallTotal = () => {
        let sub = 0; let desc = 0; let acr = 0; let ipi = 0;
        itens.forEach(i => {
            sub += (parseFloat(i.quantidade)||0) * (parseFloat(i.valor_unitario)||0);
            desc += parseFloat(i.desconto)||0;
            acr += parseFloat(i.acrescimo)||0;
            ipi += parseFloat(i.valor_ipi)||0;
        });
        return sub - desc + acr + ipi;
    };

    const handleSave = async () => {
        if (!orcamento.cliente_id) {
            toast({ title: 'Atenção', description: 'Selecione um cliente.', variant: 'warning' });
            return;
        }

        setLoading(true);
        orcamento.valor_total = calculateOverallTotal();

        try {
            let currentOrcamentoId = id;

            if (id) {
                await supabase.from('orcamentos').update(orcamento).eq('id', id);
            } else {
                const { data, error } = await insertWithCompanyId('orcamentos', orcamento, {
                    chain: (query) => query.select().single()
                });
                if (error) throw error;
                currentOrcamentoId = data.id;
            }

            // Sync items
            await supabase.from('orcamento_itens').delete().eq('orcamento_id', currentOrcamentoId);
            
            if (itens.length > 0) {
                const itemsToInsert = itens.map(i => {
                    const itemCopy = { ...i };
                    delete itemCopy.id; 
                    itemCopy.orcamento_id = currentOrcamentoId;
                    return itemCopy;
                });
                await insertWithCompanyId('orcamento_itens', itemsToInsert);
            }

            toast({ title: 'Sucesso', description: 'Orçamento salvo com sucesso!', variant: 'success' });
            navigate('/vendas/orcamentos');

        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar o orçamento.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmConvert = async () => {
        const novoPedidoId = await converterOrcamentoParaPedido(id);
        if (novoPedidoId) {
            setDialogOpen(false);
            navigate(`/vendas/pedidos/${novoPedidoId}`);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <Helmet><title>{id ? 'Editar Orçamento' : 'Novo Orçamento'} - ERP</title></Helmet>
            <PageHeader 
                title={id ? `Orçamento ${orcamento.numero}` : 'Novo Orçamento'} 
                description="Preencha os dados e classifique os itens para estimativa comercial."
            />

            {id && orcamento && (
                <Card className="border-blue-100 dark:border-border bg-blue-50/50 dark:bg-muted">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-foreground">Status de Conversão</span>
                            {orcamento.status_conversao === 'convertido' ? (
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Convertido
                                    </Badge>
                                    {orcamento.data_conversao && (
                                        <span className="text-xs text-muted-foreground">em {new Date(orcamento.data_conversao).toLocaleDateString()}</span>
                                    )}
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground w-fit">Pendente</Badge>
                            )}
                        </div>
                        
                        <div>
                            {orcamento.status_conversao === 'convertido' && orcamento.pedido_venda_id ? (
                                 <Button variant="outline" className="bg-background" onClick={() => navigate(`/vendas/pedidos/${orcamento.pedido_venda_id}`)}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver Pedido Relacionado
                                 </Button>
                            ) : (
                                 podeConverterOrcamento(orcamento.status) && (
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setDialogOpen(true)}>
                                        <ArrowRight className="w-4 h-4 mr-2" />
                                        Converter para Pedido
                                    </Button>
                                 )
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {id && <ConversaoHistorico orcamentoId={id} />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-lg">Dados do Orçamento</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Número</Label>
                            <Input value={orcamento.numero} readOnly className="bg-muted text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Label>Cliente</Label>
                            <Select value={orcamento.cliente_id} onValueChange={v => handleFieldChange('cliente_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Selecione um cliente..."/></SelectTrigger>
                                <SelectContent>
                                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Data de Emissão</Label>
                            <Input type="date" value={orcamento.data_emissao} onChange={e => handleFieldChange('data_emissao', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Data de Validade</Label>
                            <Input type="date" value={orcamento.data_validade || ''} onChange={e => handleFieldChange('data_validade', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Controle</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label>Status do Orçamento</Label>
                            <Select value={orcamento.status} onValueChange={v => handleFieldChange('status', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rascunho">Rascunho</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="enviado">Enviado ao Cliente</SelectItem>
                                    <SelectItem value="aprovado">Aprovado</SelectItem>
                                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-lg">Observações Gerais</CardTitle></CardHeader>
                <CardContent>
                    <Textarea 
                        rows={3} 
                        placeholder="Termos, condições ou observações adicionais..."
                        value={orcamento.observacoes || ''} 
                        onChange={e => handleFieldChange('observacoes', e.target.value)} 
                    />
                </CardContent>
            </Card>

            <PedidoVendaItensSection itens={itens} setItens={setItens} />
            <TotalizadoresSection itens={itens} frete={0} />

            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => navigate('/vendas/orcamentos')}><X className="w-4 h-4 mr-2"/> Cancelar</Button>
                <Button onClick={handleSave} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white"><Save className="w-4 h-4 mr-2"/> Salvar Orçamento</Button>
            </div>

            <ConversaoDialog 
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onConfirm={handleConfirmConvert}
                isLoading={isConverting}
                titulo="Converter para Pedido de Venda"
            />
        </div>
    );
};

export default OrcamentosForm;