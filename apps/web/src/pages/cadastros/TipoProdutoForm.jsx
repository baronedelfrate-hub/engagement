import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

const TipoProdutoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });
  const [validationErrors, setValidationErrors] = useState({});

  const isCreateMode = !id || id === 'novo';

  useEffect(() => {
    if (!isCreateMode) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipo_produto')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          nome: data.nome || '',
          descricao: data.descricao || '',
          ativo: data.ativo
        });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao carregar registro", variant: "destructive" });
      navigate('/cadastros/tipo-produto');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {};
    if (!formData.nome.trim()) errors.nome = "Nome é obrigatório";
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({ title: "Erro de Validação", description: "Verifique os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let error;
      if (isCreateMode) {
        const { error: insertError } = await insertWithCompanyId('tipo_produto', formData);
        error = insertError;
      } else {
        const { error: updateError } = await supabase
          .from('tipo_produto')
          .update(formData)
          .eq('id', id);
        error = updateError;
      }

      if (error) throw error;

      toast({ 
        title: "Sucesso", 
        description: isCreateMode ? "Tipo de produto criado com sucesso." : "Tipo de produto atualizado com sucesso.", 
        variant: "success" 
      });
      navigate('/cadastros/tipo-produto');
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Ocorreu um erro ao salvar o registro.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/tipo-produto')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isCreateMode ? "Novo Tipo de Produto" : "Editar Tipo de Produto"}</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados do tipo de produto/serviço</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input 
                id="nome" 
                name="nome" 
                value={formData.nome} 
                onChange={handleChange} 
                className={validationErrors.nome ? "border-red-500 text-foreground" : "text-foreground"} 
                placeholder="Ex: Produto Revenda, Serviço, Assinatura"
              />
              {validationErrors.nome && <span className="text-xs text-red-500">{validationErrors.nome}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea 
                id="descricao" 
                name="descricao" 
                value={formData.descricao} 
                onChange={handleChange} 
                className="h-24 text-foreground"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="ativo" 
                checked={formData.ativo} 
                onCheckedChange={(checked) => setFormData(p => ({ ...p, ativo: checked }))} 
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/cadastros/tipo-produto')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isCreateMode ? "Criar Registro" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TipoProdutoForm;