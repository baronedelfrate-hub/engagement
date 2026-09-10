import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import {
  calculateMargin,
  calculateMarkup,
  validateNCM,
  validateEAN,
} from '@/lib/produtosUtils';
import { useProductFormDropdowns } from '@/hooks/useProductFormDropdowns';

const ProdutosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const { categorias, subcategorias, loading: loadingDropdowns, error: dropdownError } = useProductFormDropdowns();

  const [fornecedores, setFornecedores] = useState([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [tiposProduto, setTiposProduto] = useState([]);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    sku: '',
    codigo_barras: '',
    tipo_produto_id: '',
    unidade_medida: 'UN',
    ativo: true,

    categoria_id: '',
    subcategoria_id: '',
    marca: '',

    preco_custo: 0,
    preco_venda: 0,

    controla_estoque: true,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,

    ncm: '',

    fornecedor_id: '',
  });

  const [margem, setMargem] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadDependencies();
    if (id) {
      loadProduct();
    }
  }, [id]);

  useEffect(() => {
    setMargem(calculateMargin(formData.preco_venda, formData.preco_custo));
    setMarkup(calculateMarkup(formData.preco_venda, formData.preco_custo));
  }, [formData.preco_venda, formData.preco_custo]);

  const loadDependencies = async () => {
    try {
      const { data, error } = await supabase
        .from('tipo_produto')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (!error && data) {
        setTiposProduto(data);
      }
    } catch (e) {
      console.error("Failed to load tipos produto", e);
    }

    fetchFornecedores();
  };

  const fetchFornecedores = async () => {
    setLoadingFornecedores(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome, fantasia')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoadingFornecedores(false);
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast({ title: "Erro", description: "Falha ao carregar produto", variant: "destructive" });
      navigate('/cadastros/produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    if (type === 'number') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));

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

  const validate = () => {
    const errors = {};
    if (!formData.nome) errors.nome = "Nome é obrigatório";
    if (!formData.tipo_produto_id) errors.tipo_produto_id = "Tipo do produto é obrigatório";
    if (!formData.unidade_medida) errors.unidade_medida = "Unidade de medida é obrigatória";
    if (!formData.preco_venda || formData.preco_venda <= 0) errors.preco_venda = "Preço de venda deve ser maior que zero";
    if (formData.ncm && !validateNCM(formData.ncm)) errors.ncm = "NCM inválido (deve conter 8 dígitos)";
    if (formData.codigo_barras && !validateEAN(formData.codigo_barras)) errors.codigo_barras = "Código de barras inválido";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({ title: "Erro de Validação", description: "Verifique os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Colunas uuid não aceitam string vazia — precisam ser null quando o campo (opcional) não foi preenchido.
      const uuidFields = ['tipo_produto_id', 'categoria_id', 'subcategoria_id', 'fornecedor_id'];
      const payload = { ...formData };
      uuidFields.forEach((field) => {
        if (payload[field] === '') payload[field] = null;
      });

      if (id) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await insertWithCompanyId('produtos', payload);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Produto salvo com sucesso." });
      navigate('/cadastros/produtos');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({ title: "Erro", description: error.message || "Erro ao salvar produto", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentTipo = tiposProduto.find(t => t.id === formData.tipo_produto_id);
  const isService = currentTipo?.nome?.toLowerCase().includes('serviço') ||
                    currentTipo?.nome?.toLowerCase().includes('assinatura');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/produtos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{id ? "Editar Produto" : "Novo Produto"}</h1>
            <p className="text-sm text-muted-foreground">{formData.nome || 'Preencha os dados do produto'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/cadastros/produtos')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Produto
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-2 gap-2 bg-muted/50 rounded-lg">
          <TabsTrigger value="basic" className="data-[state=active]:bg-background">Dados Básicos</TabsTrigger>
          <TabsTrigger value="classification" className="data-[state=active]:bg-background">Classificação</TabsTrigger>
          <TabsTrigger value="prices" className="data-[state=active]:bg-background">Preços</TabsTrigger>
          {!isService && <TabsTrigger value="stock" className="data-[state=active]:bg-background">Estoque</TabsTrigger>}
          <TabsTrigger value="fiscal" className="data-[state=active]:bg-background">Fiscal</TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-background">Fornecedor</TabsTrigger>
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
                <Label htmlFor="sku">Código Interno (SKU)</Label>
                <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras (EAN)</Label>
                <Input id="codigo_barras" name="codigo_barras" value={formData.codigo_barras || ''} onChange={handleChange} className={validationErrors.codigo_barras ? "border-red-500" : ""} />
                {validationErrors.codigo_barras && <span className="text-xs text-red-500">{validationErrors.codigo_barras}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo do Produto *</Label>
              <Select value={formData.tipo_produto_id} onValueChange={(val) => handleSelectChange('tipo_produto_id', val)}>
                <SelectTrigger className={validationErrors.tipo_produto_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposProduto.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.tipo_produto_id && <span className="text-xs text-red-500">{validationErrors.tipo_produto_id}</span>}
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

            <div className="flex items-center space-x-2">
              <Switch id="ativo" checked={formData.ativo} onCheckedChange={(c) => setFormData(p => ({ ...p, ativo: c }))} />
              <Label htmlFor="ativo">Ativo</Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" value={formData.descricao || ''} onChange={handleChange} rows={3} />
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
              <Input name="marca" value={formData.marca || ''} onChange={handleChange} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prices" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label>Preço de Custo (R$)</Label>
              <Input type="number" step="0.01" name="preco_custo" value={formData.preco_custo} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Preço de Venda (R$) *</Label>
              <Input type="number" step="0.01" name="preco_venda" value={formData.preco_venda} onChange={handleChange} className={`text-lg font-bold ${validationErrors.preco_venda ? "border-red-500" : ""}`} />
              {validationErrors.preco_venda && <span className="text-xs text-red-500">{validationErrors.preco_venda}</span>}
            </div>
            <div className="space-y-2">
              <Label>Margem Lucro (%)</Label>
              <Input value={margem.toFixed(2)} readOnly disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Markup (%)</Label>
              <Input value={markup.toFixed(2)} readOnly disabled className="bg-muted text-muted-foreground" />
            </div>
          </div>
        </TabsContent>

        {!isService && (
          <TabsContent value="stock" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3 mb-6 p-4 bg-muted/30 rounded-lg border">
              <Switch id="controla_estoque" checked={formData.controla_estoque} onCheckedChange={(c) => setFormData(p => ({ ...p, controla_estoque: c }))} />
              <Label htmlFor="controla_estoque" className="text-base font-medium">Controlar Estoque deste item no sistema</Label>
            </div>

            {formData.controla_estoque && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estoque Atual</Label>
                  <Input type="number" name="estoque_atual" value={formData.estoque_atual} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo (Alerta)</Label>
                  <Input type="number" name="estoque_minimo" value={formData.estoque_minimo} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Máximo</Label>
                  <Input type="number" name="estoque_maximo" value={formData.estoque_maximo || 0} onChange={handleChange} />
                </div>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="fiscal" className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>NCM (Nomenclatura Comum)</Label>
              <Input name="ncm" value={formData.ncm || ''} onChange={handleChange} placeholder="Ex: 00000000" maxLength={10} className={validationErrors.ncm ? "border-red-500" : ""} />
              {validationErrors.ncm && <span className="text-xs text-red-500">{validationErrors.ncm}</span>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 bg-card p-6 rounded-lg border shadow-sm">
          <div className="space-y-2 max-w-md">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProdutosForm;
