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
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/PageHeader';
import { Save, X, FileCheck2, Building2, Loader2 } from 'lucide-react';

import PedidoVendaItensSection from './components/PedidoVendaItensSection';
import TotalizadoresSection from './components/TotalizadoresSection';
import FreteEPagamentoSection from './components/FreteEPagamentoSection';
import { validateNFeFields } from '@/lib/nfeFieldValidator';
import { useEmpresasDropdown } from '@/hooks/useEmpresasDropdown';

const PedidosForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState([]);
    const { empresas, loading: empresasLoading } = useEmpresasDropdown();
    
    const [pedido, setPedido] = useState({
        numero: `PV-${Date.now().toString().slice(-6)}`,
        data_emissao: new Date().toISOString().split('T')[0],
        data_pedido: new Date().toISOString().split('T')[0],
        status_pedido: 'draft',
        cliente_id: '',
        empresa_id: '',
        empresa_razao_social: '',
        empresa_cnpj: '',
        empresa_ie: '',
        empresa_endereco: '',
        empresa_telefone: '',
        empresa_email: '',
        empresa_logo_path: '',
        endereco_entrega_mesmo_cliente: true,
        tipo_frete: 'SEM_FRETE',
        valor_frete: 0,
        numero_parcelas: 1
    });
    
    const [itens, setItens] = useState([]);

    const formatEnderecoCompleto = (emp) => {
        if (!emp) return '';
        const parts = [
            emp.logradouro,
            emp.numero,
            emp.complemento,
            emp.bairro,
            emp.cidade,
            emp.estado,
            emp.cep ? `CEP ${emp.cep}` : ''
        ].filter(Boolean);
        return parts.join(', ');
    };

    useEffect(() => {
        const fetchDependencies = async () => {
            const { data: cData } = await supabase.from('clientes').select('id, nome');
            if (cData) setClientes(cData);

            if (id) {
                setLoading(true);
                const { data: pData } = await supabase.from('pedidos_venda').select('*').eq('id', id).single();
                if (pData) {
                    setPedido({
                        ...pData,
                        data_pedido: pData.data_pedido || pData.data_emissao || new Date().toISOString().split('T')[0]
                    });
                }
                
                const { data: iData } = await supabase.from('pedidos_venda_itens').select('*').eq('pedido_id', id);
                if (iData) {
                    const mappedItems = iData.map(item => ({
                        ...item,
                        tipo_item: item.tipo_item || (item.servico_id ? 'servico' : 'produto'),
                        valor_unitario: item.preco_unitario || item.valor_unitario
                    }));
                    setItens(mappedItems);
                }
                setLoading(false);
            }
        };
        fetchDependencies();
    }, [id]);

    useEffect(() => {
        if (!id && empresas.length > 0 && !pedido.empresa_id) {
            handleEmpresaChange(empresas[0].id);
        }
    }, [empresas, id]);

    const handleFieldChange = (key, val) => {
        setPedido(prev => ({ ...prev, [key]: val }));
    };

    const handleEmpresaChange = (empresaId) => {
        const emp = empresas.find(e => e.id === empresaId);
        if (emp) {
            setPedido(prev => ({
                ...prev,
                empresa_id: emp.id,
                empresa_razao_social: emp.razao_social,
                empresa_cnpj: emp.cnpj,
                empresa_ie: emp.inscricao_estadual,
                empresa_endereco: formatEnderecoCompleto(emp),
                empresa_telefone: emp.telefone,
                empresa_email: emp.email,
                empresa_logo_path: emp.logo_path
            }));
        } else {
            handleFieldChange('empresa_id', empresaId);
        }
    };

    const calculateOverallTotal = () => {
        let sub = 0; let desc = 0; let acr = 0; let ipi = 0;
        itens.forEach(i => {
            sub += (parseFloat(i.quantidade)||0) * (parseFloat(i.valor_unitario || i.preco_unitario)||0);
            desc += parseFloat(i.desconto)||0;
            acr += parseFloat(i.acrescimo)||0;
            ipi += parseFloat(i.valor_ipi)||0;
        });
        return sub - desc + acr + ipi + (parseFloat(pedido.valor_frete)||0);
    };

    const handleSave = async (checkNFe = false) => {
        if (!pedido.cliente_id) {
            toast({ title: 'Atenção', description: 'Selecione um cliente.', variant: 'destructive' });
            return;
        }

        if (!pedido.data_pedido && !pedido.data_emissao) {
            toast({ title: 'Atenção', description: 'A data do pedido é obrigatória.', variant: 'destructive' });
            return;
        }

        if (!pedido.empresa_id) {
            toast({ title: 'Atenção', description: 'Selecione a empresa emitente.', variant: 'destructive' });
            return;
        }

        if (itens.length === 0) {
            toast({ title: 'Atenção', description: 'Adicione pelo menos um item ao pedido.', variant: 'destructive' });
            return;
        }

        if (checkNFe) {
            const errors = validateNFeFields(pedido, itens);
            if (errors.length > 0) {
                toast({ title: 'Pendências para NFe', description: errors.join(' | '), variant: 'destructive' });
                return;
            }
            pedido.status_pedido = 'confirmed'; 
        }

        setLoading(true);
        pedido.valor_total = calculateOverallTotal();

        try {
            let currentPedidoId = id;
            
            const pedidoData = {
                ...pedido,
                data_pedido: pedido.data_pedido || pedido.data_emissao,
                created_by: null
            };

            if (id) {
                const { error: updateError } = await supabase.from('pedidos_venda').update(pedidoData).eq('id', id);
                if (updateError) throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);
            } else {
                const { data, error: insertError } = await insertWithCompanyId('pedidos_venda', pedidoData, {
                    chain: (query) => query.select().single()
                });
                if (insertError) throw new Error(`Falha ao criar pedido: ${insertError.message}`);
                currentPedidoId = data.id;
            }

            const { error: deleteError } = await supabase.from('pedidos_venda_itens').delete().eq('pedido_id', currentPedidoId);
            if (deleteError) throw new Error(`Falha ao limpar itens antigos: ${deleteError.message}`);
            
            const itemsToInsert = itens.map(i => {
                const isServico = i.tipo_item === 'servico' || i.tipo_item === 'serviço' || i.servico_id;
                
                return {
                    pedido_id: currentPedidoId,
                    tipo_item: isServico ? 'servico' : 'produto',
                    produto_id: isServico ? null : (i.produto_id || null),
                    servico_id: isServico ? (i.servico_id || null) : null,
                    descricao: i.descricao || null,
                    categoria_id: i.categoria_id || null,
                    subcategoria_id: i.subcategoria_id || null,
                    centro_custos_id: i.centro_custos_id || null,
                    quantidade: parseFloat(i.quantidade || 0),
                    preco_unitario: parseFloat(i.valor_unitario || i.preco_unitario || 0),
                    valor_total: parseFloat(i.valor_total || 0),
                    desconto: parseFloat(i.desconto || 0),
                    acrescimo: parseFloat(i.acrescimo || 0),
                    ncm: i.ncm || null,
                    cfop: i.cfop || null,
                    created_by: null
                };
            });
            
            const { error: itemsError } = await insertWithCompanyId('pedidos_venda_itens', itemsToInsert);
            if (itemsError) throw new Error(`Falha ao salvar itens: ${itemsError.message}`);

            toast({ title: 'Sucesso', description: 'Pedido salvo com sucesso!' });
            navigate('/vendas/pedidos');

        } catch (error) {
            console.error('[PedidosForm] Error saving:', error);
            toast({ title: 'Erro ao Salvar', description: error.message || 'Ocorreu um erro inesperado.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const selectedEmpresa = empresas.find(e => e.id === pedido.empresa_id);

    const getLogoUrl = (path) => {
        if (!path) return null;
        return supabase.storage.from('logos').getPublicUrl(path).data?.publicUrl;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <Helmet><title>{id ? 'Editar Pedido' : 'Novo Pedido'} - ERP</title></Helmet>
            <PageHeader 
                title={id ? `Pedido ${pedido.numero}` : 'Novo Pedido de Venda'} 
                description="Preencha os dados completos e classifique os itens."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-lg">Identificação do Pedido</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Número do Pedido</Label>
                            <Input value={pedido.numero} readOnly className="bg-muted text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Label>Data de Emissão</Label>
                            <Input type="date" value={pedido.data_emissao} onChange={e => {
                                handleFieldChange('data_emissao', e.target.value);
                                handleFieldChange('data_pedido', e.target.value);
                            }} />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <Label>Status</Label>
                            <Select value={pedido.status_pedido} onValueChange={v => handleFieldChange('status_pedido', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Rascunho</SelectItem>
                                    <SelectItem value="confirmed">Confirmado</SelectItem>
                                    <SelectItem value="invoiced">Faturado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                            <Label>Cliente</Label>
                            <Select value={pedido.cliente_id} onValueChange={v => handleFieldChange('cliente_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Selecione um cliente..."/></SelectTrigger>
                                <SelectContent>
                                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Empresa Emitente</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label>Selecione a Empresa</Label>
                            <Select value={pedido.empresa_id} onValueChange={handleEmpresaChange} disabled={empresasLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder={empresasLoading ? "Carregando..." : "Selecione a empresa..."}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {empresas.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.razao_social} {e.cnpj ? `- ${e.cnpj}` : ''} {e.nome_fantasia ? `(${e.nome_fantasia})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {empresasLoading ? (
                             <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-muted rounded-md border border-dashed">
                                 <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                 <span className="text-xs">Carregando empresas...</span>
                             </div>
                        ) : selectedEmpresa ? (
                            <div className="bg-muted p-4 rounded-md border text-sm space-y-3">
                                {selectedEmpresa.logo_path && (
                                    <div className="flex justify-center mb-2">
                                        <img src={getLogoUrl(selectedEmpresa.logo_path)} alt="Logo da Empresa" className="h-12 object-contain" />
                                    </div>
                                )}
                                <div>
                                    <span className="font-semibold text-muted-foreground block text-xs">Razão Social</span>
                                    <span className="text-foreground">{selectedEmpresa.razao_social}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="font-semibold text-muted-foreground block text-xs">CNPJ</span>
                                        <span className="text-foreground">{selectedEmpresa.cnpj || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-muted-foreground block text-xs">Insc. Estadual</span>
                                        <span className="text-foreground">{selectedEmpresa.inscricao_estadual || '-'}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground block text-xs">Endereço Completo</span>
                                    <span className="text-foreground">{formatEnderecoCompleto(selectedEmpresa) || '-'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="font-semibold text-muted-foreground block text-xs">Telefone</span>
                                        <span className="text-foreground">{selectedEmpresa.telefone || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-muted-foreground block text-xs">Email</span>
                                        <span className="text-foreground truncate block" title={selectedEmpresa.email}>{selectedEmpresa.email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-muted rounded-md border border-dashed">
                                <Building2 className="h-8 w-8 mb-2 opacity-50" />
                                <span className="text-xs">Nenhuma empresa selecionada</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-lg">Endereço de Entrega</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                        <Checkbox 
                            id="mesmo_cliente" 
                            checked={pedido.endereco_entrega_mesmo_cliente} 
                            onCheckedChange={v => handleFieldChange('endereco_entrega_mesmo_cliente', !!v)} 
                        />
                        <Label htmlFor="mesmo_cliente" className="cursor-pointer">Utilizar mesmo endereço de cadastro do cliente</Label>
                    </div>

                    {!pedido.endereco_entrega_mesmo_cliente && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted p-4 rounded-md border border-border">
                            <div className="space-y-1 md:col-span-2">
                                <Label>Rua/Logradouro</Label>
                                <Input value={pedido.endereco_entrega_rua || ''} onChange={e => handleFieldChange('endereco_entrega_rua', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Número</Label>
                                <Input value={pedido.endereco_entrega_numero || ''} onChange={e => handleFieldChange('endereco_entrega_numero', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Complemento</Label>
                                <Input value={pedido.endereco_entrega_complemento || ''} onChange={e => handleFieldChange('endereco_entrega_complemento', e.target.value)} />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label>Bairro</Label>
                                <Input value={pedido.endereco_entrega_bairro || ''} onChange={e => handleFieldChange('endereco_entrega_bairro', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Cidade</Label>
                                <Input value={pedido.endereco_entrega_cidade || ''} onChange={e => handleFieldChange('endereco_entrega_cidade', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Estado / CEP</Label>
                                <div className="flex gap-2">
                                    <Input className="w-16" placeholder="UF" value={pedido.endereco_entrega_estado || ''} onChange={e => handleFieldChange('endereco_entrega_estado', e.target.value)} />
                                    <Input className="flex-1" placeholder="CEP" value={pedido.endereco_entrega_cep || ''} onChange={e => handleFieldChange('endereco_entrega_cep', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <PedidoVendaItensSection itens={itens} setItens={setItens} />
            <FreteEPagamentoSection pedido={pedido} onChange={handleFieldChange} />
            <TotalizadoresSection itens={itens} frete={pedido.valor_frete} />

            <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => navigate('/vendas/pedidos')}><X className="w-4 h-4 mr-2"/> Cancelar</Button>
                <Button onClick={() => handleSave(false)} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2"/>} Salvar Pedido
                </Button>
                <Button variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleSave(true)} disabled={loading}>
                    <FileCheck2 className="w-4 h-4 mr-2"/> Salvar e Validar NFe
                </Button>
            </div>
        </div>
    );
};

export default PedidosForm;