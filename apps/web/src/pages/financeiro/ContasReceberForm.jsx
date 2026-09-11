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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Calculator, Layers, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateParcelaRecords } from '@/lib/parcelamentoUtils';
import { formatDateOnly } from '@/lib/dateUtils';

function ContasReceberForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = !!id;
  
  const { 
    clientes, 
    empresas,
    bancos,
    categorias,
    subcategorias,
    centrosCusto,
    tiposPagamento,
    condicoesPagamento,
    tiposDocumento,
    origens,
    loading: loadingDropdowns 
  } = useFinanceiroDropdowns();

  const [loading, setLoading] = useState(false);
  const [editGroup, setEditGroup] = useState(false);
  const [previewParcelas, setPreviewParcelas] = useState([]);

  const [formData, setFormData] = useState({
    numeroTitulo: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: new Date().toISOString().split('T')[0],
    cliente_id: '',
    valorTotal: '',
    empresa_id: '',
    observacoes: '',
    banco_id: '',
    categoria_id: '',
    subcategoria_id: '',
    centro_custo_id: '',
    tipo_pagamento_id: '',
    condicao_pagamento_id: '',
    tipo_documento_id: '',
    origem_id: '',

    // Parcelamento fields
    parcelado: false,
    numero_parcelas: 1,
    intervalo_dias: 30,
    dataPrimeiraParcela: new Date().toISOString().split('T')[0],
    parcela_grupo_id: null,
    parcela_atual: 1
  });

  // Filter subcategorias based on selected categoria
  const filteredSubcategorias = formData.categoria_id 
    ? subcategorias.filter(sub => sub.categoria_id === formData.categoria_id) 
    : [];

  useEffect(() => {
    if (id) {
      fetchConta();
    } else {
        // Generate random number for new entries
        setFormData(prev => ({ ...prev, numeroTitulo: `CR-${Date.now().toString().slice(-6)}` }));
    }
  }, [id]);

  useEffect(() => {
    if (formData.parcelado && formData.valorTotal && formData.numero_parcelas > 1) {
        calculateParcels();
    } else {
        setPreviewParcelas([]);
    }
  }, [formData.parcelado, formData.valorTotal, formData.numero_parcelas, formData.dataPrimeiraParcela, formData.intervalo_dias]);

  const calculateParcels = () => {
    try {
        const parcels = generateParcelaRecords({
            basePayload: {}, // Not needed for preview
            valor_original: formData.valorTotal,
            data_vencimento: formData.dataPrimeiraParcela,
            numero_parcelas: formData.numero_parcelas,
            intervalo_dias: formData.intervalo_dias,
        });
        setPreviewParcelas(parcels);
    } catch(e) {
        console.log("Simulação incompleta");
    }
  };

  const fetchConta = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contas_receber')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setFormData({
            numeroTitulo: data.numero || '', 
            valorTotal: data.valor_original || '',
            cliente_id: data.cliente_id || '',
            empresa_id: data.company_id || '', 
            dataEmissao: data.data_emissao || '',
            dataVencimento: data.data_vencimento || '',
            observacoes: data.observacoes || '',
            banco_id: data.banco_id || '',
            categoria_id: data.categoria_id || '',
            subcategoria_id: data.subcategoria_id || '',
            centro_custo_id: data.centro_custo_id || '',
            tipo_pagamento_id: data.tipo_pagamento_id || '',
            condicao_pagamento_id: data.condicao_pagamento_id || '',
            tipo_documento_id: data.tipo_documento_id || '',
            origem_id: data.origem_id || '',
            
            // Parcelamento loading
            parcelado: (data.numero_parcelas > 1) || false,
            numero_parcelas: data.numero_parcelas || 1,
            intervalo_dias: data.intervalo_dias || 30,
            dataPrimeiraParcela: data.data_vencimento || '', // When editing, current due date acts as "base" if re-generating
            parcela_grupo_id: data.parcela_grupo_id,
            parcela_atual: data.parcela_atual || 1
        });
        
        // If editing a parcel in a group, default to single edit
        if (data.parcela_grupo_id && data.numero_parcelas > 1) {
            setEditGroup(false);
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao carregar conta.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.numeroTitulo || !formData.cliente_id || !formData.empresa_id || !formData.valorTotal) {
        return toast({ title: "Campos Obrigatórios", description: "Preencha todos os campos marcados com *.", variant: "destructive" });
    }
    setLoading(true);

    try {
        const basePayload = {
            cliente_id: formData.cliente_id || null,
            company_id: formData.empresa_id || null,
            data_emissao: formData.dataEmissao,
            observacoes: formData.observacoes,
            banco_id: formData.banco_id || null,
            categoria_id: formData.categoria_id || null,
            subcategoria_id: formData.subcategoria_id || null,
            centro_custo_id: formData.centro_custo_id || null,
            tipo_pagamento_id: formData.tipo_pagamento_id || null,
            condicao_pagamento_id: formData.condicao_pagamento_id || null,
            tipo_documento_id: formData.tipo_documento_id || null,
            origem_id: formData.origem_id || null,
            status: 'Pendente', // Default status
            status_cobranca: 'nao_iniciada'
        };

        if (isEditing) {
            if (editGroup && formData.parcela_grupo_id) {
                // Delete all existing and recreate
                const { error: deleteError } = await supabase.from('contas_receber').delete().eq('parcela_grupo_id', formData.parcela_grupo_id);
                if (deleteError) throw deleteError;
                
                // Recreate all
                const recordsToInsert = generateParcelaRecords({
                    basePayload: { ...basePayload, numero: formData.numeroTitulo.split('-PARC')[0] }, 
                    valor_original: formData.valorTotal,
                    data_vencimento: formData.dataPrimeiraParcela,
                    numero_parcelas: formData.numero_parcelas,
                    intervalo_dias: formData.intervalo_dias,
                });
                const { error: insertError } = await supabase.from('contas_receber').insert(recordsToInsert);
                if (insertError) throw insertError;
                toast({ title: "Grupo Atualizado", description: "Todas as parcelas foram recriadas." });
            } else {
                // Update single record
                const { error } = await supabase.from('contas_receber').update({ 
                    ...basePayload,
                    numero: formData.numeroTitulo, 
                    valor_original: formData.valorTotal, 
                    data_vencimento: formData.dataVencimento,
                    // Preserve status if editing single
                    status: undefined, 
                    status_cobranca: undefined 
                }).eq('id', id);
                if (error) throw error;
                toast({ title: "Sucesso", description: "Conta atualizada." });
            }
        } else {
            // New creation
            const recordsToInsert = generateParcelaRecords({
                basePayload: { ...basePayload, numero: formData.numeroTitulo },
                valor_original: formData.valorTotal,
                data_vencimento: formData.dataPrimeiraParcela, // Use the parcel start date logic
                numero_parcelas: formData.parcelado ? formData.numero_parcelas : 1,
                intervalo_dias: formData.intervalo_dias,
            });

            // Ensure single record uses correct due date if not parcelado
            if (!formData.parcelado) {
                 recordsToInsert[0].data_vencimento = formData.dataVencimento;
            }

            const { error } = await supabase.from('contas_receber').insert(recordsToInsert);
            if (error) throw error;
            toast({ title: "Sucesso", description: `${recordsToInsert.length} registro(s) criado(s).` });
        }
        navigate('/financeiro/contas-receber');
    } catch (error) {
        console.error(error);
        toast({ title: "Erro", description: "Erro ao salvar conta: " + error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loadingDropdowns) {
      return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <>
      <Helmet><title>{id ? 'Editar' : 'Nova'} Conta a Receber</title></Helmet>
      <PageHeader title={id ? 'Editar Conta a Receber' : 'Nova Conta a Receber'} showBack customBack={() => navigate('/financeiro/contas-receber')}/>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-10">
          
          {isEditing && formData.parcela_grupo_id && (
             <Alert className="mb-4 border-blue-800 bg-blue-900/20 text-blue-200">
                <Layers className="h-4 w-4" />
                <AlertTitle>Edição de Parcelamento</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 mt-2">
                    <p>Este título é a parcela {formData.parcela_atual} de {formData.numero_parcelas}.</p>
                    <div className="flex items-center space-x-2 bg-black/20 p-2 rounded">
                        <Checkbox id="editGroup" checked={editGroup} onCheckedChange={setEditGroup} />
                        <Label htmlFor="editGroup" className="cursor-pointer font-medium">Editar todo o grupo de parcelas (recalcular valores/datas)</Label>
                    </div>
                    {editGroup && <p className="text-xs text-yellow-300">Atenção: Ao editar o grupo, todas as parcelas serão excluídas e recriadas.</p>}
                </AlertDescription>
             </Alert>
          )}

            {/* Identificação */}
            <Card>
                <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Empresa (Filial) *</Label>
                        <Select value={formData.empresa_id} onValueChange={(v) => handleSelectChange('empresa_id', v)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {empresas.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social || 'Sem Nome'}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Cliente *</Label>
                        <Select value={formData.cliente_id} onValueChange={(v) => handleSelectChange('cliente_id', v)} required>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Número do Título *</Label>
                        <div className="relative">
                            <Input name="numeroTitulo" value={formData.numeroTitulo} onChange={handleChange} required />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10 text-muted-foreground" onClick={() => setFormData({...formData, numeroTitulo: `CR-${Date.now().toString().slice(-6)}`})} title="Gerar Automático"><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Emissão *</Label>
                        <Input type="date" name="dataEmissao" value={formData.dataEmissao} onChange={handleChange} required />
                    </div>

                    {(!formData.parcelado || (isEditing && !editGroup)) && (
                        <div className="space-y-2">
                            <Label>Data de Vencimento *</Label>
                            <Input type="date" name="dataVencimento" value={formData.dataVencimento} onChange={handleChange} required />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Valor Total (R$) *</Label>
                        <Input type="number" step="0.01" name="valorTotal" value={formData.valorTotal} onChange={handleChange} required />
                    </div>
                </CardContent>
            </Card>

            {/* Classificação */}
            <Card>
                <CardHeader><CardTitle>Classificação</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={formData.categoria_id} onValueChange={(v) => handleSelectChange('categoria_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Subcategoria</Label>
                        <Select value={formData.subcategoria_id} onValueChange={(v) => handleSelectChange('subcategoria_id', v)} disabled={!formData.categoria_id}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {filteredSubcategorias.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Centro de Custo</Label>
                        <Select value={formData.centro_custo_id} onValueChange={(v) => handleSelectChange('centro_custo_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Pagamento & Documentação */}
            <Card>
                <CardHeader><CardTitle>Pagamento & Documentação</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Banco de Preferência</Label>
                        <Select value={formData.banco_id} onValueChange={(v) => handleSelectChange('banco_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Pagamento</Label>
                        <Select value={formData.tipo_pagamento_id} onValueChange={(v) => handleSelectChange('tipo_pagamento_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {tiposPagamento.map(tp => <SelectItem key={tp.id} value={tp.id}>{tp.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Condição de Pagamento</Label>
                        <Select value={formData.condicao_pagamento_id} onValueChange={(v) => handleSelectChange('condicao_pagamento_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {condicoesPagamento.map(cp => <SelectItem key={cp.id} value={cp.id}>{cp.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Documento</Label>
                        <Select value={formData.tipo_documento_id} onValueChange={(v) => handleSelectChange('tipo_documento_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {tiposDocumento.map(td => <SelectItem key={td.id} value={td.id}>{td.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Origem</Label>
                        <Select value={formData.origem_id} onValueChange={(v) => handleSelectChange('origem_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {origens.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={4} />
                    </div>
                </CardContent>
            </Card>

            {/* Parcelamento Section */}
            <Card className="mb-6 border-blue-900/30 bg-blue-950/10">
                <CardHeader className="pb-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="parcelado" 
                            checked={formData.parcelado} 
                            onCheckedChange={v => { if(!isEditing || editGroup) { setFormData({...formData, parcelado: v, numero_parcelas: v ? 2 : 1}) } }} 
                            disabled={isEditing && !editGroup} 
                        />
                        <Label htmlFor="parcelado" className="font-semibold text-blue-400 cursor-pointer select-none">
                            Gerar Parcelamento
                        </Label>
                    </div>
                </CardHeader>
                {(formData.parcelado) && (
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="space-y-2">
                                <Label>Número de Parcelas</Label>
                                <Input 
                                    type="number" 
                                    min="1" 
                                    max="60" 
                                    value={formData.numero_parcelas} 
                                    onChange={e => setFormData({...formData, numero_parcelas: e.target.value})} 
                                    disabled={isEditing && !editGroup} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vencimento da 1ª</Label>
                                <Input 
                                    type="date" 
                                    value={formData.dataPrimeiraParcela} 
                                    onChange={e => setFormData({...formData, dataPrimeiraParcela: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Intervalo entre Parcelas</Label>
                                <Select 
                                    value={String(formData.intervalo_dias)} 
                                    onValueChange={v => handleSelectChange('intervalo_dias', v)} 
                                    disabled={isEditing && !editGroup}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 dias</SelectItem>
                                        <SelectItem value="15">15 dias</SelectItem>
                                        <SelectItem value="30">30 dias</SelectItem>
                                        <SelectItem value="45">45 dias</SelectItem>
                                        <SelectItem value="60">60 dias</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {previewParcelas.length > 0 && (
                            <div className="border border-border rounded-lg overflow-hidden bg-background">
                                <div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calculator className="h-3 w-3" /> Simulação de Parcelas
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-background/50 text-muted-foreground border-b border-border">
                                        <tr>
                                            <th className="px-4 py-2 text-left w-20">#</th>
                                            <th className="px-4 py-2 text-left">Vencimento</th>
                                            <th className="px-4 py-2 text-left">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {previewParcelas.map((p) => (
                                            <tr key={p.parcela_atual}>
                                                <td className="px-4 py-2 font-mono text-muted-foreground">{p.parcela_atual}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(p.data_vencimento)}</td>
                                                <td className="px-4 py-2 text-emerald-400 font-medium">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_original)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/financeiro/contas-receber')}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {isEditing ? (editGroup ? 'Atualizar Grupo' : 'Atualizar') : 'Salvar'}
                </Button>
            </div>
        </form>
      </motion.div>
    </>
  );
}

export default ContasReceberForm;