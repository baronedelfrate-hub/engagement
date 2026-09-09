import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Save, Loader2, RefreshCw, Calculator, AlertTriangle, Layers } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { generateParcelaRecords } from '@/lib/parcelamentoUtils';

const ContasPagarForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [editGroup, setEditGroup] = useState(false);

  const { 
    fornecedores, categorias, subcategorias, centrosCusto, projetos, 
    empresas, bancos, tiposDocumento, condicoesPagamento, tiposPagamento, origens,
    loading: loadingDropdowns 
  } = useFinanceiroDropdowns();

  const [formData, setFormData] = useState({
    numeroTitulo: '', fornecedorId: '', empresaId: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    valorTotal: '', bancoId: '', tipoDocumentoId: '', condicaoPagamentoId: '',
    tipoPagamentoId: '', categoriaId: '', subcategoriaId: '', centroCustosId: '',
    projetoId: '', origemId: '', observacoes: '',
    
    // Parcelamento fields
    parcelado: false,
    numero_parcelas: 1,
    intervalo_dias: 30,
    dataPrimeiraParcela: new Date().toISOString().split('T')[0],
    parcela_grupo_id: null,
    parcela_atual: 1
  });

  const [previewParcelas, setPreviewParcelas] = useState([]);
  
  const filteredSubcategorias = formData.categoriaId 
    ? subcategorias.filter(sub => sub.categoria_id === formData.categoriaId) : [];

  useEffect(() => {
    if (isEditing) loadData();
    else setFormData(prev => ({ ...prev, numeroTitulo: `CP-${Date.now().toString().slice(-6)}` }));
  }, [id, isEditing]);

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
        // Silent error or simple log as user might be typing
        console.log("Simulação incompleta");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from('contas_pagar').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) {
            setFormData({
              numeroTitulo: data.numero || '', fornecedorId: data.fornecedor_id || '',
              empresaId: data.company_id || '', dataEmissao: data.data_emissao || '',
              valorTotal: data.valor_original || '', bancoId: data.banco_id || '',
              tipoDocumentoId: data.tipo_documento_id || '', condicaoPagamentoId: data.condicao_pagamento_id || '',
              tipoPagamentoId: data.tipo_pagamento_id || '', categoriaId: data.categoria_id || '',
              subcategoriaId: data.subcategoria_id || '', centroCustosId: data.centro_custo_id || '',
              projetoId: data.projeto_id || '', origemId: data.origem_id || '', observacoes: data.observacoes || '',
              parcelado: data.parcelado || (data.numero_parcelas > 1) || false,
              numero_parcelas: data.numero_parcelas || 1,
              intervalo_dias: data.intervalo_dias || 30,
              dataPrimeiraParcela: data.data_vencimento || '',
              parcela_grupo_id: data.parcela_grupo_id,
              parcela_atual: data.parcela_atual || 1
            });
            
            // If editing a parcel in a group, default to single edit
            if (data.parcela_grupo_id && data.numero_parcelas > 1) {
                setEditGroup(false);
            }
        }
    } catch (error) { toast({ title: "Erro", description: "Erro ao carregar dados.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.numeroTitulo || !formData.fornecedorId || !formData.empresaId || !formData.valorTotal) {
      return toast({ title: "Campos Obrigatórios", description: "Preencha todos os campos com *.", variant: "destructive" });
    }

    setLoading(true);
    try {
        const basePayload = {
            fornecedor_id: formData.fornecedorId, company_id: formData.empresaId,
            data_emissao: formData.dataEmissao, observacoes: formData.observacoes,
            banco_id: formData.bancoId || null, tipo_documento_id: formData.tipoDocumentoId || null,
            condicao_pagamento_id: formData.condicaoPagamentoId || null, tipo_pagamento_id: formData.tipoPagamentoId || null,
            categoria_id: formData.categoriaId || null, subcategoria_id: formData.subcategoriaId || null,
            centro_custo_id: formData.centro_custo_id || null, projeto_id: formData.projetoId || null,
            origem_id: formData.origem_id || null,
        };

        if (isEditing) {
            if (editGroup && formData.parcela_grupo_id) {
                // Delete all existing and recreate
                const { error: deleteError } = await supabase.from('contas_pagar').delete().eq('parcela_grupo_id', formData.parcela_grupo_id);
                if (deleteError) throw deleteError;
                
                // Recreate all
                const recordsToInsert = generateParcelaRecords({
                    basePayload: { ...basePayload, numero: formData.numeroTitulo.split('-PARC')[0] }, // Strip PARC suffix to regenerate
                    valor_original: formData.valorTotal,
                    data_vencimento: formData.dataPrimeiraParcela,
                    numero_parcelas: formData.numero_parcelas,
                    intervalo_dias: formData.intervalo_dias,
                });
                const { error: insertError } = await supabase.from('contas_pagar').insert(recordsToInsert);
                if (insertError) throw insertError;
                toast({ title: "Grupo Atualizado", description: "Todas as parcelas foram recriadas." });
            } else {
                // Update single record
                const { error } = await supabase.from('contas_pagar').update({ 
                    ...basePayload, 
                    numero: formData.numeroTitulo, 
                    valor_original: formData.valorTotal, 
                    data_vencimento: formData.dataPrimeiraParcela 
                }).eq('id', id);
                if (error) throw error;
                toast({ title: "Atualizado" });
            }
        } else {
            // New creation
            const recordsToInsert = generateParcelaRecords({
                basePayload: { ...basePayload, numero: formData.numeroTitulo },
                valor_original: formData.valorTotal,
                data_vencimento: formData.dataPrimeiraParcela,
                numero_parcelas: formData.parcelado ? formData.numero_parcelas : 1,
                intervalo_dias: formData.intervalo_dias,
            });
            const { error } = await supabase.from('contas_pagar').insert(recordsToInsert);
            if (error) throw error;
            toast({ title: "Criado", description: `${recordsToInsert.length} lançamento(s) criado(s).` });
        }
        navigate('/financeiro/contas-pagar');
    } catch (error) {
        toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  
  const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  if (loadingDropdowns) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <Helmet><title>{isEditing ? 'Editar' : 'Nova'} Conta a Pagar</title></Helmet>
      <PageHeader title={isEditing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'} showBack />
      
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
                {editGroup && <p className="text-xs text-yellow-300">Atenção: Ao editar o grupo, todas as parcelas serão excluídas e recriadas com os novos parâmetros.</p>}
            </AlertDescription>
         </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
            <CardHeader><CardTitle>Dados Principais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Número do Título *</Label>
                    <div className="relative">
                        <Input value={formData.numeroTitulo} onChange={e => setFormData({...formData, numeroTitulo: e.target.value})} placeholder="Ex: NF-12345" />
                        <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10 text-muted-foreground" onClick={() => setFormData({...formData, numeroTitulo: `CP-${Date.now().toString().slice(-6)}`})} title="Gerar Automático"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>Fornecedor *</Label>
                    <Select value={formData.fornecedorId} onValueChange={v => handleSelectChange('fornecedorId', v)}>
                        <SelectTrigger className="!text-foreground">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                            {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-foreground">{f.nome} {f.cnpj ? `(${f.cnpj})` : ''}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Select value={formData.empresaId} onValueChange={v => handleSelectChange('empresaId', v)}>
                        <SelectTrigger className="!text-foreground">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                            {empresas.map(f => <SelectItem key={f.id} value={f.id} className="text-foreground">{f.nome_fantasia || f.razao_social || 'Sem Nome'}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2"><Label>Data de Emissão</Label><Input type="date" value={formData.dataEmissao} onChange={e => setFormData({...formData, dataEmissao: e.target.value})} /></div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Detalhes & Classificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Valor Total (R$) *</Label><Input type="number" step="0.01" value={formData.valorTotal} onChange={e => setFormData({...formData, valorTotal: e.target.value})} /></div>
                    <div className="space-y-2">
                        <Label>Banco Pref.</Label>
                        <Select value={formData.bancoId} onValueChange={v => handleSelectChange('bancoId', v)}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                {bancos.map(b => <SelectItem key={b.id} value={b.id} className="text-foreground">{b.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={formData.categoriaId} onValueChange={v => setFormData({...formData, categoriaId: v, subcategoriaId: ''})}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                {categorias.map(c => <SelectItem key={c.id} value={c.id} className="text-foreground">{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Subcategoria</Label>
                        <Select value={formData.subcategoriaId} onValueChange={v => handleSelectChange('subcategoriaId', v)} disabled={!formData.categoriaId}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                {filteredSubcategorias.map(sc => <SelectItem key={sc.id} value={sc.id} className="text-foreground">{sc.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Centro de Custo</Label>
                        <Select value={formData.centroCustosId} onValueChange={v => handleSelectChange('centroCustosId', v)}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id} className="text-foreground">{cc.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Projeto</Label>
                        <Select value={formData.projetoId} onValueChange={v => handleSelectChange('projetoId', v)}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                {projetos.map(p => <SelectItem key={p.id} value={p.id} className="text-foreground">{p.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-blue-900/30 bg-blue-950/10">
          <CardHeader className="pb-2"><div className="flex items-center space-x-2"><Checkbox id="parcelado" checked={formData.parcelado} onCheckedChange={v => { if(!isEditing || editGroup) { setFormData({...formData, parcelado: v, numero_parcelas: v ? 2 : 1}) } }} disabled={isEditing && !editGroup} /><Label htmlFor="parcelado" className="font-semibold text-blue-400 cursor-pointer select-none">Gerar Parcelamento</Label></div></CardHeader>
          {(formData.parcelado) && (
              <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="space-y-2"><Label>Número de Parcelas</Label><Input type="number" min="1" max="60" value={formData.numero_parcelas} onChange={e => setFormData({...formData, numero_parcelas: e.target.value})} disabled={isEditing && !editGroup} /></div>
                      <div className="space-y-2"><Label>Vencimento da 1ª</Label><Input type="date" value={formData.dataPrimeiraParcela} onChange={e => setFormData({...formData, dataPrimeiraParcela: e.target.value})} /></div>
                      <div className="space-y-2">
                        <Label>Intervalo entre Parcelas</Label>
                        <Select value={String(formData.intervalo_dias)} onValueChange={v => handleSelectChange('intervalo_dias', v)} disabled={isEditing && !editGroup}>
                            <SelectTrigger className="!text-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                                <SelectItem value="7" className="text-foreground">7 dias</SelectItem>
                                <SelectItem value="15" className="text-foreground">15 dias</SelectItem>
                                <SelectItem value="30" className="text-foreground">30 dias</SelectItem>
                                <SelectItem value="45" className="text-foreground">45 dias</SelectItem>
                                <SelectItem value="60" className="text-foreground">60 dias</SelectItem>
                            </SelectContent>
                        </Select>
                      </div>
                  </div>
                  {previewParcelas.length > 0 && (<div className="border border-border rounded-lg overflow-hidden bg-background"><div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Calculator className="h-3 w-3" /> Simulação de Parcelas</div><table className="w-full text-sm"><thead className="bg-background/50 text-muted-foreground border-b border-border"><tr><th className="px-4 py-2 text-left w-20">#</th><th className="px-4 py-2 text-left">Vencimento</th><th className="px-4 py-2 text-left">Valor</th></tr></thead><tbody className="divide-y divide-border">{previewParcelas.map((p) => (<tr key={p.parcela_atual}><td className="px-4 py-2 font-mono text-muted-foreground">{p.parcela_atual}</td><td className="px-4 py-2 text-muted-foreground">{new Date(p.data_vencimento).toLocaleDateString()}</td><td className="px-4 py-2 text-emerald-400 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_original)}</td></tr>))}</tbody></table></div>)}
              </CardContent>
          )}
      </Card>

      <Card className="mb-6"><CardHeader><CardTitle>Observações</CardTitle></CardHeader><CardContent><Textarea value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} placeholder="Informações adicionais..." rows={3} /></CardContent></Card>
      <div className="flex gap-4 justify-end"><Button variant="outline" onClick={() => navigate('/financeiro/contas-pagar')}>Cancelar</Button><Button className="bg-emerald-600 hover:bg-emerald-700 min-w-[150px]" onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}{isEditing ? (editGroup ? 'Salvar Grupo' : 'Atualizar Parcela') : 'Salvar Lançamento'}</Button></div>
    </div>
  );
};

export default ContasPagarForm;