import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { resolveCompanyId } from '@/lib/companyUtils';
import { Loader2 } from 'lucide-react';

function SubcategoriasForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    categoria_id: '',
    descricao: ''
  });
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    fetchCategorias();
    if (id) {
      fetchSubcategoria();
    }
  }, [id]);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      console.log('Categorias loaded:', data);
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive"
      });
    }
  };

  const fetchSubcategoria = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setFormData({
          nome: data.nome || '',
          categoria_id: data.categoria_id || '',
          descricao: data.descricao || ''
        });
      }
    } catch (error) {
      console.error('Error fetching subcategoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a subcategoria.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.categoria_id) {
        toast({
            title: "Campo Obrigatório",
            description: "Selecione uma Categoria Pai.",
            variant: "destructive"
        });
        return;
    }

    setLoading(true);
    try {
      if (id) {
        const { error } = await supabase
          .from('subcategorias')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Subcategoria atualizada com sucesso." });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const companyId = await resolveCompanyId(user);
        const payload = companyId ? { ...formData, company_id: companyId } : formData;

        console.log('📤 [subcategorias] company_id resolvido:', companyId);
        console.log('📤 [subcategorias] Tentando criar novo registro...', payload);

        const { error } = await supabase
          .from('subcategorias')
          .insert([payload]);
        if (error) {
          console.error('❌ [subcategorias] Create Falhou:', error);
          console.error('   Payload enviado:', payload);
          throw error;
        }
        toast({ title: "Sucesso", description: "Subcategoria cadastrada com sucesso." });
      }
      navigate('/cadastros/subcategorias');
    } catch (error) {
      console.error('Error saving subcategoria:', error);
      toast({
        title: "Erro",
        description: error?.message || "Ocorreu um erro ao salvar a subcategoria.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Helmet>
        <title>{id ? 'Editar' : 'Nova'} Subcategoria - ERP Platform</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} subcategory in your ERP classification system`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Subcategoria' : 'Nova Subcategoria'}
        description={id ? 'Atualize as informações da subcategoria' : 'Cadastre uma nova subcategoria'}
        showBack customBack={() => navigate('/cadastros/subcategorias')}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações da Subcategoria</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria_id">Categoria Pai *</Label>
                  <Select 
                    value={formData.categoria_id} 
                    onValueChange={(value) => setFormData({...formData, categoria_id: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma categoria..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {categorias.length > 0 ? (
                          categorias.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
                            </SelectItem>
                          ))
                      ) : (
                          <SelectItem value="none" disabled>Nenhuma categoria cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/cadastros/subcategorias')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {id ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default SubcategoriasForm;