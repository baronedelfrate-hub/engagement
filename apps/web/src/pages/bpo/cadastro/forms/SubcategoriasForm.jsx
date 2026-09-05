import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBPOCadastro } from '@/hooks/useBPOCadastro';
import { fetchById, create, update } from '@/services/bpo/cadastro/subcategoriasService';
import { fetchAll as fetchCategorias } from '@/services/bpo/cadastro/categoriasService';

const SubcategoriasForm = ({ clientId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  const isEdit = mode === 'edit' && id;

  const [categorias, setCategorias] = useState([]);
  const { loading, setLoading, showSuccess, showError } = useBPOCadastro();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      nome: '',
      categoria_id: '',
      descricao: '',
      ativo: true,
    }
  });

  useEffect(() => {
    loadCategorias();
    if (isEdit) {
      loadSubcategoria();
    }
  }, [isEdit, id]);

  const loadCategorias = async () => {
    const { data, error } = await fetchCategorias(clientId);
    if (!error && data) {
      setCategorias(data);
    }
  };

  const loadSubcategoria = async () => {
    setLoading(true);
    const { data, error } = await fetchById(clientId, id);
    setLoading(false);

    if (error) {
      showError('Erro ao carregar subcategoria');
      navigate(`/cliente/${clientId}/cadastro/subcategorias`);
      return;
    }

    Object.keys(data).forEach(key => {
      setValue(key, data[key]);
    });
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const { error } = isEdit 
      ? await update(clientId, id, data)
      : await create(clientId, data);
    setLoading(false);

    if (error) {
      showError(`Erro ao ${isEdit ? 'atualizar' : 'criar'} subcategoria`);
      return;
    }

    showSuccess(`Subcategoria ${isEdit ? 'atualizada' : 'criada'} com sucesso`);
    
    if (!isEdit) {
      reset();
    }
    
    navigate(`/cliente/${clientId}/cadastro/subcategorias`);
  };

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Editar' : 'Nova'} Subcategoria - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/cliente/${clientId}/cadastro/subcategorias`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? 'Editar' : 'Nova'} Subcategoria
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Subcategoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  {...register('nome', { required: 'Nome é obrigatório' })}
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria_id">Categoria *</Label>
                <Select
                  value={watch('categoria_id')}
                  onValueChange={(value) => setValue('categoria_id', value)}
                >
                  <SelectTrigger className={errors.categoria_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoria_id && (
                  <p className="text-sm text-destructive">{errors.categoria_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" {...register('descricao')} rows={3} />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={watch('ativo')}
                  onCheckedChange={(checked) => setValue('ativo', checked)}
                />
                <Label>Ativo</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 mt-6">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/cliente/${clientId}/cadastro/subcategorias`)}
            >
              Voltar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default SubcategoriasForm;