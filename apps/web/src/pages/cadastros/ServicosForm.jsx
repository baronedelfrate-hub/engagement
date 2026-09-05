import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { useServicosFormDropdowns } from '@/hooks/useServicosFormDropdowns';
import FileUploader from '@/components/FileUploader';

const ServicosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  const { 
    tipos_servico, unidades_medida, categorias, subcategorias, 
    fornecedores, centrosCusto, contas_receita, natureza_operacao,
    loading: loadingDropdowns 
  } = useServicosFormDropdowns();

  const [formData, setFormData] = useState({
    nome: '',
    codigo_interno: '',
    codigo_barras: '',
    tipo: '',
    unidade_medida: '',
    status: 'ativo',
    ativo: true,
    
    categoria_id: '',
    subcategoria_id: '',
    marca: '',
    linha_familia: '',
    
    preco: 0, // Preço Padrão
    custo: 0,
    margem: 0,
    preco_minimo: 0,
    preco_maximo: 0,
    
    controla_estoque: false,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    
    codigo_servico_lc116: '',
    descricao_fiscal: '',
    aliquota_issqn: 0,
    aliquota_pis: 0,
    aliquota_cofins: 0,
    aliquota_irrf: 0,
    natureza_operacao: '',
    centro_custo_id: '',
    conta_receita_id: '',
    
    fornecedor_id: '',
    codigo_fornecedor: '',
    prazo_entrega: 0,
    ultimo_fornecedor: '',
    
    descricao_curta: '',
    descricao: '', // Descrição Detalhada
    observacoes_comerciais: '',
    imagem_url: '',
    imagem_path: '',
    documentos: []
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (id) {
      loadServico();
    }
  }, [id]);

  const loadServico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      if (data) {
        setFormData(prev => ({ 
          ...prev, 
          ...data,
          documentos: data.documentos || [],
          status: data.status || (data.ativo ? 'ativo' : 'inativo')
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast({ title: "Erro", description: "Falha ao carregar serviço", variant: "destructive" });
      navigate('/cadastros/servicos');
    } finally {
      setLoading(false);
    }
  };

  const calculateMargem = (preco, custo) => {
    const p = parseFloat(preco) || 0;
    const c = parseFloat(custo) || 0;
    if (p <= 0) return 0;
    return ((p - c) / p) * 100;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    if (type === 'number') {
      newValue = value === '' ? '' : parseFloat(value);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      if (['preco', 'custo'].includes(name)) {
        updated.margem = calculateMargem(
          name === 'preco' ? newValue : prev.preco,
          name === 'custo' ? newValue : prev.custo
        );
      }

      return updated;
    });
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'categoria_id') {
        updated.subcategoria_id = '';
      }
      return updated;
    });
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileUpload = (url, path, type, originalName = '') => {
    if (type === 'image') {
      setFormData(prev => ({ ...prev, imagem_url: url, imagem_path: path }));
    } else if (type === 'document') {
      if (url) {
        setFormData(prev => {
          const newDocName = originalName || `Documento ${prev.documentos.length + 1}`;
          return { 
            ...prev, 
            documentos: [...prev.documentos, { url, path, name: newDocName, type: 'file' }]
          };
        });
      }
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => {
      const newDocs = [...prev.documentos];
      newDocs.splice(index, 1);
      return { ...prev, documentos: newDocs };
    });
  };

  const validate = () => {
    const errors = {};
    if (!formData.nome) errors.nome = "Nome é obrigatório";
    if (!formData.tipo) errors.tipo = "Tipo é obrigatório";
    if (!formData.unidade_medida) errors.unidade_medida = "Unidade é obrigatória";
    if (formData.preco === '' || formData.preco === null) errors.preco = "Preço Padrão é obrigatório";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: "Erro de Validação", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      setActiveTab("basic");
      return;
    }

    setLoading(true);
    try {
      // Sync status and ativo
      const dataToSave = {
        ...formData,
        ativo: formData.status === 'ativo'
      };

      let error;
      if (id) {
        const res = await supabase.from('servicos').update(dataToSave).eq('id', id);
        error = res.error;
      } else {
        const res = await insertWithCompanyId('servicos', dataToSave);
        error = res.error;
      }

      if (error) throw error;

      toast({ title: "Sucesso", description: "Serviço salvo com sucesso.", variant: "success", className: "bg-green-600 text-white border-none" });
      navigate('/cadastros/servicos');
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Erro", description: error.message || "Erro ao salvar serviço", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/servicos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{id ? "Editar Serviço" : "Novo Serviço"}</h1>
            <p className="text-sm text-muted-foreground">{formData.nome || 'Preencha os dados do serviço'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/cadastros/servicos')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Serviço
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-2 gap-2 bg-muted/50 rounded-lg">
          <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
          <TabsTrigger value="classification">Classificação</TabsTrigger>
          <TabsTrigger value="prices">Preços e Custos</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="commercial">Comercial</TabsTrigger>
          <TabsTrigger value="files">Arquivos e Fotos</TabsTrigger>
        </TabsList>

        {/* TAB: DADOS BÁSICOS */}
        <TabsContent value="basic" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Serviço *</Label>
              <Input id="nome" name="nome" value={formData.nome} onChange={handleChange} className={validationErrors.nome ? "border-red-500" : ""} />
              {validationErrors.nome && <span className="text-xs text-red-500">{validationErrors.nome}</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_interno">Código Interno</Label>
                <Input id="codigo_interno" name="codigo_interno" value={formData.codigo_interno} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras (EAN)</Label>
                <Input id="codigo_barras" name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Serviço *</Label>
              <Select value={formData.tipo} onValueChange={(val) => handleSelectChange('tipo', val)}>
                <SelectTrigger className={validationErrors.tipo ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tipos_servico.map(t => (
                    <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                  ))}
                  {formData.tipo && !tipos_servico.some(t => t.nome === formData.tipo) && (
                     <SelectItem value={formData.tipo}>{formData.tipo}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {validationErrors.tipo && <span className="text-xs text-red-500">{validationErrors.tipo}</span>}
            </div>

            <div className="space-y-2">
              <Label>Unidade de Medida *</Label>
              <Select value={formData.unidade_medida} onValueChange={(val) => handleSelectChange('unidade_medida', val)}>
                <SelectTrigger className={validationErrors.unidade_medida ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidades_medida.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.unidade_medida && <span className="text-xs text-red-500">{validationErrors.unidade_medida}</span>}
            </div>

            <div className="flex items-center space-x-3 pt-6">
                <Switch id="status" checked={formData.status === 'ativo'} onCheckedChange={(c) => handleSelectChange('status', c ? 'ativo' : 'inativo')} />
                <Label htmlFor="status">Serviço Ativo</Label>
            </div>
          </div>
        </TabsContent>

        {/* TAB: CLASSIFICAÇÃO */}
        <TabsContent value="classification" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.categoria_id} onValueChange={(val) => handleSelectChange('categoria_id', val)} disabled={loadingDropdowns}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDropdowns ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={formData.subcategoria_id} onValueChange={(val) => handleSelectChange('subcategoria_id', val)} disabled={!formData.categoria_id}>
                <SelectTrigger>
                  <SelectValue placeholder={!formData.categoria_id ? "Selecione a categoria antes" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias.filter(s => s.categoria_id === formData.categoria_id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input name="marca" value={formData.marca} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label>Linha / Família</Label>
              <Input name="linha_familia" value={formData.linha_familia} onChange={handleChange} />
            </div>
          </div>
        </TabsContent>

        {/* TAB: PREÇOS E CUSTOS */}
        <TabsContent value="prices" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 border p-5 rounded-lg bg-slate-50/50">
              <h3 className="font-semibold text-lg border-b pb-2">Custos</h3>
              <div className="space-y-2">
                <Label>Custo Padrão (R$)</Label>
                <Input type="number" step="0.01" name="custo" value={formData.custo} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-4 border p-5 rounded-lg bg-primary/5">
              <h3 className="font-semibold text-lg border-b border-primary/20 pb-2">Venda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                   <Label>Preço Padrão (R$) *</Label>
                   <Input type="number" step="0.01" name="preco" value={formData.preco} onChange={handleChange} className={`text-lg font-bold ${validationErrors.preco ? "border-red-500" : ""}`} />
                   {validationErrors.preco && <span className="text-xs text-red-500">{validationErrors.preco}</span>}
                </div>
                <div className="space-y-2">
                   <Label>Margem Lucro (%)</Label>
                   <Input value={formData.margem.toFixed(2)} readOnly disabled className="bg-white/50 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10 mt-2">
                <div className="space-y-2">
                   <Label>Preço Mínimo (R$)</Label>
                   <Input type="number" step="0.01" name="preco_minimo" value={formData.preco_minimo} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                   <Label>Preço Máximo (R$)</Label>
                   <Input type="number" step="0.01" name="preco_maximo" value={formData.preco_maximo} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: ESTOQUE */}
        <TabsContent value="stock" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-6 p-4 bg-muted/30 rounded-lg border">
                <Switch id="controla_estoque" checked={formData.controla_estoque} onCheckedChange={(c) => setFormData(p => ({...p, controla_estoque: c}))} />
                <Label htmlFor="controla_estoque" className="text-base font-medium">Controlar Estoque / Disponibilidade</Label>
            </div>

            {formData.controla_estoque && (
                <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                    <div className="space-y-2">
                        <Label>Quantidade em Estoque</Label>
                        <Input type="number" name="estoque_atual" value={formData.estoque_atual} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Estoque Mínimo</Label>
                        <Input type="number" name="estoque_minimo" value={formData.estoque_minimo} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label>Estoque Máximo</Label>
                        <Input type="number" name="estoque_maximo" value={formData.estoque_maximo} onChange={handleChange} />
                    </div>
                </div>
            )}
        </TabsContent>

        {/* TAB: FISCAL */}
        <TabsContent value="fiscal" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Código de Serviço (LC 116/03)</Label>
                    <Input name="codigo_servico_lc116" value={formData.codigo_servico_lc116} onChange={handleChange} placeholder="Ex: 14.01" />
                    <p className="text-xs text-muted-foreground">Código de item da lista de serviços anexa à Lei Complementar 116.</p>
                </div>
                 <div className="space-y-2">
                    <Label>Descrição Fiscal</Label>
                    <Input name="descricao_fiscal" value={formData.descricao_fiscal} onChange={handleChange} />
                </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h4 className="font-medium mb-4">Alíquotas e Retenções (%)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label>ISSQN (%)</Label>
                      <Input type="number" name="aliquota_issqn" value={formData.aliquota_issqn} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label>PIS (%)</Label>
                      <Input type="number" name="aliquota_pis" value={formData.aliquota_pis} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label>COFINS (%)</Label>
                      <Input type="number" name="aliquota_cofins" value={formData.aliquota_cofins} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label>IRRF (%)</Label>
                      <Input type="number" name="aliquota_irrf" value={formData.aliquota_irrf} onChange={handleChange} />
                  </div>
              </div>
            </div>

            <div className="border-t pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <Label>Natureza da Operação</Label>
                   <Select value={formData.natureza_operacao} onValueChange={(val) => handleSelectChange('natureza_operacao', val)}>
                     <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                     </SelectTrigger>
                     <SelectContent>
                        {natureza_operacao.map(n => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>Centro de Custo Padrão</Label>
                   <Select value={formData.centro_custo_id} onValueChange={(val) => handleSelectChange('centro_custo_id', val)}>
                     <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                     </SelectTrigger>
                     <SelectContent>
                        {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>Conta Receita</Label>
                   <Select value={formData.conta_receita_id} onValueChange={(val) => handleSelectChange('conta_receita_id', val)}>
                     <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                     </SelectTrigger>
                     <SelectContent>
                        {contas_receita.map(cr => <SelectItem key={cr.id} value={cr.id}>{cr.nome}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
            </div>
        </TabsContent>

        {/* TAB: FORNECEDORES */}
        <TabsContent value="suppliers" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Fornecedor Principal / Parceiro</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(val) => handleSelectChange('fornecedor_id', val)} disabled={loadingDropdowns}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um fornecedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.fantasia || f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Código no Fornecedor</Label>
                    <Input name="codigo_fornecedor" value={formData.codigo_fornecedor} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Prazo Médio de Entrega/Execução (dias)</Label>
                    <Input type="number" name="prazo_entrega" value={formData.prazo_entrega} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-6 bg-muted/20 p-5 rounded-lg border">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">Histórico</h4>
                <div className="space-y-2">
                    <Label>Último Fornecedor Utilizado</Label>
                    <Input value={formData.ultimo_fornecedor || 'Nenhum registro'} readOnly className="bg-muted" />
                </div>
              </div>
           </div>
        </TabsContent>

        {/* TAB: COMERCIAL */}
        <TabsContent value="commercial" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
             <div className="space-y-2">
                 <Label>Descrição Curta (Aparece em Notas Fiscais e Recibos)</Label>
                 <Textarea name="descricao_curta" value={formData.descricao_curta} onChange={handleChange} maxLength={255} className="h-20 resize-none" />
                 <p className="text-xs text-right text-muted-foreground">{formData.descricao_curta?.length || 0}/255 caracteres</p>
             </div>
             
             <div className="space-y-2">
                 <Label>Descrição Detalhada (Catálogos e Orçamentos)</Label>
                 <Textarea name="descricao" value={formData.descricao} onChange={handleChange} className="h-32" />
             </div>

             <div className="space-y-2">
                 <Label>Observações Comerciais Internas</Label>
                 <Textarea name="observacoes_comerciais" value={formData.observacoes_comerciais} onChange={handleChange} className="h-32 bg-yellow-50 dark:bg-yellow-950/20" />
             </div>
        </TabsContent>

        {/* TAB: ARQUIVOS E FOTOS */}
        <TabsContent value="files" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">Imagem do Serviço</h3>
                      <p className="text-sm text-muted-foreground mb-4">Adicione uma imagem representativa (PNG, JPG, GIF - Max 5MB)</p>
                    </div>
                    <FileUploader 
                       type="image"
                       currentUrl={formData.imagem_url}
                       currentPath={formData.imagem_path}
                       onUploadComplete={(url, path) => handleFileUpload(url, path, 'image')}
                    />
                </div>
                
                <div className="space-y-4">
                     <div>
                       <h3 className="font-medium text-lg">Documentos e Manuais</h3>
                       <p className="text-sm text-muted-foreground mb-4">Anexos como contratos padrão, escopos ou manuais (PDF, DOC - Max 10MB)</p>
                     </div>
                     <FileUploader 
                       type="documento"
                       onUploadComplete={(url, path) => handleFileUpload(url, path, 'document')}
                       label="Adicionar Documento"
                    />
                    
                    {formData.documentos && formData.documentos.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {formData.documentos.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm group hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-md">
                                          <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div className="truncate flex flex-col">
                                          <span className="font-medium truncate" title={doc.name}>{doc.name || 'Documento Anexado'}</span>
                                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">Visualizar arquivo</a>
                                        </div>
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleRemoveDocument(idx)} 
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-50 group-hover:opacity-100 transition-opacity"
                                      title="Remover documento"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServicosForm;