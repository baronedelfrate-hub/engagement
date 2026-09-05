import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { produtoService } from '@/services/produtoService';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { 
  calculateMargin, 
  calculateMarkup, 
  validateNCM, 
  validateEAN,
  validateRequiredFields 
} from '@/lib/produtosUtils';
import FileUploader from '@/components/FileUploader';
import { useProductFormDropdowns } from '@/hooks/useProductFormDropdowns';

const ProdutosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  const { categorias, subcategorias, centrosCusto, loading: loadingDropdowns, error: dropdownError } = useProductFormDropdowns();

  const [contasContabeis, setContasContabeis] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [brands, setBrands] = useState([]);
  const [tiposProduto, setTiposProduto] = useState([]);

  const [formData, setFormData] = useState({
    nome: '',
    codigo_interno: '',
    codigo_barras: '',
    tipo: '',
    unidade_medida: 'UN',
    status: 'Ativo',
    
    categoria_id: '',
    subcategoria_id: '',
    marca: '',
    linha_familia: '',
    centro_custo_id: '',
    conta_receita_id: '',
    conta_custo_id: '',
    
    preco_custo: 0,
    ultimo_custo: 0,
    custo_medio: 0,
    custo_padrao: 0,
    preco_venda: 0,
    margem: 0,
    markup: 0,
    permite_desconto: false,
    desconto_maximo: 0,
    
    controla_estoque: true,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    deposito_localizacao: '',
    controle_lote: false,
    controle_validade: false,
    
    ncm: '',
    cst_csosn: '',
    cfop_padrao: '',
    origem_mercadoria: 'Nacional',
    aliquota_icms: 0,
    aliquota_pis: 0,
    aliquota_cofins: 0,
    iss: 0,
    
    fornecedor_id: '',
    codigo_produto_fornecedor: '',
    prazo_entrega_dias: 0,
    ultimo_fornecedor: '',
    
    comissionavel: false,
    percentual_comissao: 0,
    vendavel_online: false,
    exibir_catalogo: false,
    
    descricao_curta: '',
    descricao_detalhada: '',
    observacoes_internas: '',
    imagem_url: '',
    imagem_path: '', // Added to track path for deletion
    documentos: [] 
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadDependencies();
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadDependencies = async () => {
    try {
      const { data, error } = await supabase
        .from('tipo_produto')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (!error && data) {
        setTiposProduto(data);
        if (!id && data.length > 0 && !formData.tipo) {
          setFormData(prev => ({ ...prev, tipo: data[0].id }));
        }
      }
    } catch (e) {
      console.error("Failed to load tipos produto", e);
    }
    
    setContasContabeis([
      { id: '1', nome: 'Receita de Vendas' },
      { id: '2', nome: 'Receita de Serviços' },
      { id: '3', nome: 'CMV - Custo Mercadoria Vendida' }
    ]);
    
    fetchFornecedores();

    const products = storage.get('PRODUTOS') || [];
    const uniqueBrands = [...new Set(products.map(p => p.marca).filter(Boolean))];
    setBrands(uniqueBrands);
  };

  const fetchFornecedores = async () => {
    setLoadingFornecedores(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome, fantasia')
        .eq('ativo', true)
        .order('nome');
        
      if (error) {
         const fallback = await supabase
          .from('fornecedores')
          .select('id, nome, fantasia')
          .order('nome');
         if (fallback.data) {
           setFornecedores(fallback.data);
         } else {
           throw fallback.error;
         }
      } else {
         setFornecedores(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoadingFornecedores(false);
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    const result = await produtoService.getById(id);
    if (result.success) {
      setFormData(prev => ({ 
        ...prev, 
        ...result.data,
        documentos: result.data.documentos || [],
        imagem_url: result.data.imagem_url || '',
        imagem_path: result.data.imagem_path || ''
      }));
    } else {
      toast({ title: "Erro", description: "Falha ao carregar produto", variant: "destructive" });
      navigate('/cadastros/produtos');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    if (type === 'number') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      if (['preco_venda', 'preco_custo'].includes(name)) {
        updated.margem = calculateMargin(updated.preco_venda, updated.preco_custo);
        updated.markup = calculateMarkup(updated.preco_venda, updated.preco_custo);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateRequiredFields(formData);
    
    if (formData.ncm && !validateNCM(formData.ncm)) {
        validation.errors.ncm = "NCM inválido (deve conter 8 dígitos)";
        validation.isValid = false;
    }

    if (formData.codigo_barras && !validateEAN(formData.codigo_barras)) {
        validation.errors.codigo_barras = "Código de barras inválido";
        validation.isValid = false;
    }

    if (!formData.tipo) {
      validation.errors.tipo = "Tipo é obrigatório";
      validation.isValid = false;
    }

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({ title: "Erro de Validação", description: "Verifique os campos obrigatórios na aba de Dados Básicos e Fiscal.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const result = id 
      ? await produtoService.update(id, formData)
      : await produtoService.create(formData);

    if (result.success) {
      toast({ title: "Sucesso", description: "Produto salvo com sucesso.", variant: "success", className: "bg-green-600 text-white border-none" });
      navigate('/cadastros/produtos');
    } else {
      toast({ title: "Erro", description: result.error || "Erro ao salvar produto", variant: "destructive" });
    }
    setLoading(false);
  };

  const currentTipo = tiposProduto.find(t => t.id === formData.tipo);
  const isService = currentTipo?.nome?.toLowerCase().includes('serviço') || 
                    currentTipo?.nome?.toLowerCase().includes('assinatura') || 
                    (typeof formData.tipo === 'string' && (formData.tipo.toLowerCase().includes('serviço') || formData.tipo.toLowerCase().includes('assinatura')));

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/produtos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{id ? "Editar Produto" : "Novo Produto"}</h1>
            <p className="text-sm text-slate-500">{formData.nome || 'Preencha os dados do produto'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/cadastros/produtos')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Produto
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-2 gap-2 bg-muted/50 rounded-lg">
          <TabsTrigger value="basic" className="data-[state=active]:bg-background">Dados Básicos</TabsTrigger>
          <TabsTrigger value="classification" className="data-[state=active]:bg-background">Classificação</TabsTrigger>
          <TabsTrigger value="prices" className="data-[state=active]:bg-background">Preços e Custos</TabsTrigger>
          {!isService && <TabsTrigger value="stock" className="data-[state=active]:bg-background">Estoque</TabsTrigger>}
          <TabsTrigger value="fiscal" className="data-[state=active]:bg-background">Fiscal</TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-background">Fornecedores</TabsTrigger>
          <TabsTrigger value="commercial" className="data-[state=active]:bg-background">Comercial</TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-background">Arquivos e Fotos</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Produto *</Label>
              <Input id="nome" name="nome" value={formData.nome} onChange={handleChange} className={validationErrors.nome ? "border-red-500" : ""} />
              {validationErrors.nome && <span className="text-xs text-red-500">{validationErrors.nome}</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_interno">Código Interno (SKU)</Label>
                <Input id="codigo_interno" name="codigo_interno" value={formData.codigo_interno} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras (EAN)</Label>
                <Input id="codigo_barras" name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} />
                {validationErrors.codigo_barras && <span className="text-xs text-red-500">{validationErrors.codigo_barras}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo do Produto *</Label>
              <Select value={formData.tipo} onValueChange={(val) => handleSelectChange('tipo', val)}>
                <SelectTrigger className={validationErrors.tipo ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposProduto.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                  {formData.tipo && !tiposProduto.some(t => t.id === formData.tipo) && typeof formData.tipo === 'string' && !formData.tipo.includes('-') && (
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
                  <SelectItem value="UN">Unidade (UN)</SelectItem>
                  <SelectItem value="KG">Quilograma (KG)</SelectItem>
                  <SelectItem value="L">Litro (L)</SelectItem>
                  <SelectItem value="M">Metro (M)</SelectItem>
                  <SelectItem value="M2">Metro Quadrado (M2)</SelectItem>
                  <SelectItem value="M3">Metro Cúbico (M3)</SelectItem>
                  <SelectItem value="H">Hora (H)</SelectItem>
                  <SelectItem value="MES">Mês (MES)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="classification" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.categoria_id} onValueChange={(val) => handleSelectChange('categoria_id', val)} disabled={loadingDropdowns}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDropdowns ? "Carregando categorias..." : dropdownError ? "Erro ao carregar" : "Selecione uma categoria"} />
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
              <Select value={formData.subcategoria_id} onValueChange={(val) => handleSelectChange('subcategoria_id', val)} disabled={loadingDropdowns || !formData.categoria_id}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDropdowns ? "Carregando subcategorias..." : !formData.categoria_id ? "Selecione a categoria antes" : "Selecione uma subcategoria"} />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias
                    .filter(s => s.categoria_id === formData.categoria_id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input name="marca" value={formData.marca} onChange={handleChange} list="brands-list" />
              <datalist id="brands-list">
                {brands.map((b, i) => <option key={i} value={b} />)}
              </datalist>
            </div>
            
            <div className="space-y-2">
              <Label>Linha / Família</Label>
              <Input name="linha_familia" value={formData.linha_familia} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label>Centro de Custo Padrão *</Label>
              <Select value={formData.centro_custo_id} onValueChange={(val) => handleSelectChange('centro_custo_id', val)} disabled={loadingDropdowns}>
                <SelectTrigger className={validationErrors.centro_custo_id ? "border-red-500" : ""}>
                  <SelectValue placeholder={loadingDropdowns ? "Carregando..." : dropdownError ? "Erro" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {centrosCusto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.centro_custo_id && <span className="text-xs text-red-500">{validationErrors.centro_custo_id}</span>}
            </div>

            <div className="space-y-2">
              <Label>Conta Receita *</Label>
              <Select value={formData.conta_receita_id} onValueChange={(val) => handleSelectChange('conta_receita_id', val)}>
                <SelectTrigger className={validationErrors.conta_receita_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                   {contasContabeis.map(c => (
                     <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Conta Custo</Label>
               <Select value={formData.conta_custo_id} onValueChange={(val) => handleSelectChange('conta_custo_id', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                   {contasContabeis.map(c => (
                     <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prices" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 border p-5 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
              <h3 className="font-semibold text-lg border-b pb-2">Custos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input type="number" step="0.01" name="preco_custo" value={formData.preco_custo} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                   <Label>Custo Padrão (R$)</Label>
                   <Input type="number" step="0.01" name="custo_padrao" value={formData.custo_padrao} onChange={handleChange} />
                </div>
                <div className="space-y-2 opacity-70">
                   <Label>Último Custo (R$)</Label>
                   <Input value={formData.ultimo_custo || 0} readOnly disabled className="bg-muted text-slate-500" />
                </div>
                <div className="space-y-2 opacity-70">
                   <Label>Custo Médio (R$)</Label>
                   <Input value={formData.custo_medio || 0} readOnly disabled className="bg-muted text-slate-500" />
                </div>
              </div>
            </div>

            <div className="space-y-4 border p-5 rounded-lg bg-primary/5">
              <h3 className="font-semibold text-lg border-b border-primary/20 pb-2">Venda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                   <Label>Preço de Venda (R$) *</Label>
                   <Input type="number" step="0.01" name="preco_venda" value={formData.preco_venda} onChange={handleChange} className={`text-lg font-bold ${validationErrors.preco_venda ? "border-red-500" : ""}`} />
                </div>
                <div className="space-y-2">
                   <Label>Margem Lucro (%)</Label>
                   <Input value={formData.margem.toFixed(2)} readOnly disabled className="bg-white/50 dark:bg-black/50 font-mono text-slate-500" />
                </div>
                <div className="space-y-2">
                   <Label>Markup (%)</Label>
                   <Input value={formData.markup.toFixed(2)} readOnly disabled className="bg-white/50 dark:bg-black/50 font-mono text-slate-500" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-primary/10 mt-2">
                 <div className="flex items-center space-x-2 mb-3">
                    <Checkbox id="permite_desconto" checked={formData.permite_desconto} onCheckedChange={(c) => setFormData(p => ({...p, permite_desconto: c}))} />
                    <Label htmlFor="permite_desconto" className="font-medium">Permite Desconto neste item</Label>
                 </div>
                 {formData.permite_desconto && (
                   <div className="space-y-2 animate-in fade-in slide-in-from-top-2 ml-6">
                      <Label>Desconto Máximo Permitido (%)</Label>
                      <Input type="number" name="desconto_maximo" value={formData.desconto_maximo} onChange={handleChange} className="w-1/2" />
                   </div>
                 )}
              </div>
            </div>
          </div>
        </TabsContent>

        {!isService && (
          <TabsContent value="stock" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-6 p-4 bg-muted/30 rounded-lg border">
                <Switch id="controla_estoque" checked={formData.controla_estoque} onCheckedChange={(c) => setFormData(p => ({...p, controla_estoque: c}))} />
                <Label htmlFor="controla_estoque" className="text-base font-medium">Controlar Estoque deste item no sistema</Label>
            </div>

            {formData.controla_estoque && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Estoque Atual</Label>
                        <Input type="number" value={formData.estoque_atual} readOnly className="bg-muted font-semibold" />
                    </div>
                    <div className="space-y-2">
                        <Label>Depósito / Local Padrão</Label>
                        <Input name="deposito_localizacao" value={formData.deposito_localizacao} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Estoque Mínimo (Alerta)</Label>
                        <Input type="number" name="estoque_minimo" value={formData.estoque_minimo} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                        <Label>Estoque Máximo</Label>
                        <Input type="number" name="estoque_maximo" value={formData.estoque_maximo} onChange={handleChange} />
                    </div>
                </div>
                
                <div className="space-y-4 p-5 border rounded-lg bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-2">Controles Adicionais</h4>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="controle_lote" checked={formData.controle_lote} onCheckedChange={(c) => setFormData(p => ({...p, controle_lote: c}))} />
                        <Label htmlFor="controle_lote">Exigir Lote nas movimentações (Entrada/Saída)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="controle_validade" checked={formData.controle_validade} onCheckedChange={(c) => setFormData(p => ({...p, controle_validade: c}))} />
                        <Label htmlFor="controle_validade">Controlar data de validade do produto</Label>
                    </div>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="fiscal" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label>NCM (Nomenclatura Comum)</Label>
                    <Input name="ncm" value={formData.ncm} onChange={handleChange} placeholder="Ex: 0000.00.00" maxLength={10} />
                    {validationErrors.ncm && <span className="text-xs text-red-500">{validationErrors.ncm}</span>}
                </div>
                 <div className="space-y-2">
                    <Label>CST / CSOSN Padrão</Label>
                    <Input name="cst_csosn" value={formData.cst_csosn} onChange={handleChange} placeholder="Ex: 0102" />
                </div>
                 <div className="space-y-2">
                    <Label>CFOP Padrão (Saída)</Label>
                    <Input name="cfop_padrao" value={formData.cfop_padrao} onChange={handleChange} placeholder="Ex: 5102" />
                </div>
                
                <div className="space-y-2">
                   <Label>Origem da Mercadoria</Label>
                   <Select value={formData.origem_mercadoria} onValueChange={(val) => handleSelectChange('origem_mercadoria', val)}>
                     <SelectTrigger>
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Nacional">0 - Nacional</SelectItem>
                        <SelectItem value="Importada">1 - Estrangeira (Importação direta)</SelectItem>
                        <SelectItem value="Importada_Mercado">2 - Estrangeira (Adquirida no mercado interno)</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h4 className="font-medium mb-4">Alíquotas Padrão (%)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                      <Label>ICMS (%)</Label>
                      <Input type="number" name="aliquota_icms" value={formData.aliquota_icms} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                      <Label>PIS (%)</Label>
                      <Input type="number" name="aliquota_pis" value={formData.aliquota_pis} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                      <Label>COFINS (%)</Label>
                      <Input type="number" name="aliquota_cofins" value={formData.aliquota_cofins} onChange={handleChange} />
                  </div>

                  {isService && (
                      <div className="space-y-2">
                          <Label>ISS (%)</Label>
                          <Input type="number" name="iss" value={formData.iss} onChange={handleChange} />
                      </div>
                  )}
              </div>
            </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Fornecedor Principal</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(val) => handleSelectChange('fornecedor_id', val)} disabled={loadingFornecedores}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingFornecedores ? "Carregando fornecedores..." : "Selecione um fornecedor..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.fantasia || f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Código do Produto no Fornecedor</Label>
                    <Input name="codigo_produto_fornecedor" value={formData.codigo_produto_fornecedor} onChange={handleChange} placeholder="Código usado pelo fornecedor para este item" />
                </div>
                <div className="space-y-2">
                    <Label>Prazo Médio de Entrega (dias)</Label>
                    <Input type="number" name="prazo_entrega_dias" value={formData.prazo_entrega_dias} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-6 bg-muted/20 p-5 rounded-lg border">
                <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-2">Histórico de Compras</h4>
                <div className="space-y-2">
                    <Label>Último Fornecedor a fornecer o item</Label>
                    <Input value={formData.ultimo_fornecedor || 'Nenhum registro'} readOnly className="bg-muted text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 mt-4 italic">O histórico é atualizado automaticamente ao dar entrada em notas fiscais de compra vinculadas a este produto.</p>
              </div>
           </div>
        </TabsContent>

        <TabsContent value="commercial" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4 border p-5 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                  <div className="flex items-center space-x-2">
                     <Checkbox id="comissionavel" checked={formData.comissionavel} onCheckedChange={(c) => setFormData(p => ({...p, comissionavel: c}))} />
                     <Label htmlFor="comissionavel" className="font-medium">Produto Comissionável</Label>
                  </div>
                  <p className="text-sm text-slate-500 ml-6">Marque se as vendas deste produto geram comissão para os vendedores.</p>
                  
                  {formData.comissionavel && (
                     <div className="space-y-2 ml-6 mt-4 animate-in fade-in">
                        <Label>Percentual de Comissão Padrão (%)</Label>
                        <Input type="number" step="0.1" name="percentual_comissao" value={formData.percentual_comissao} onChange={handleChange} className="w-1/2" />
                     </div>
                  )}
               </div>

               <div className="space-y-4 border p-5 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                  <div className="flex items-center space-x-2">
                     <Checkbox id="vendavel_online" checked={formData.vendavel_online} onCheckedChange={(c) => setFormData(p => ({...p, vendavel_online: c}))} />
                     <Label htmlFor="vendavel_online" className="font-medium">Disponível para Venda Online (E-commerce)</Label>
                  </div>
                  
                  {formData.vendavel_online && (
                     <div className="flex items-center space-x-2 ml-6 mt-4 animate-in fade-in">
                        <Checkbox id="exibir_catalogo" checked={formData.exibir_catalogo} onCheckedChange={(c) => setFormData(p => ({...p, exibir_catalogo: c}))} />
                        <Label htmlFor="exibir_catalogo">Exibir no Catálogo de Vendas Digital</Label>
                     </div>
                  )}
               </div>
            </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
             <div className="space-y-2">
                 <Label>Descrição Curta (Aparece em Notas Fiscais e Recibos)</Label>
                 <Textarea name="descricao_curta" value={formData.descricao_curta} onChange={handleChange} maxLength={255} className="h-20 resize-none" />
                 <p className="text-xs text-right text-slate-500">{formData.descricao_curta?.length || 0}/255 caracteres</p>
             </div>
             
             <div className="space-y-2">
                 <Label>Descrição Detalhada (Aparece em catálogos e orçamentos)</Label>
                 <Textarea name="descricao_detalhada" value={formData.descricao_detalhada} onChange={handleChange} className="h-32" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t">
                <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">Foto do Produto</h3>
                      <p className="text-sm text-slate-500 mb-4">Adicione uma imagem principal para o produto (Máx 5MB)</p>
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
                       <h3 className="font-medium text-lg">Manuais e Documentos</h3>
                       <p className="text-sm text-slate-500 mb-4">Fichas técnicas, manuais de uso ou laudos (Máx 10MB/arquivo)</p>
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

export default ProdutosForm;