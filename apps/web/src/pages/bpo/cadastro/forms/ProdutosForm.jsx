import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBPOCadastro } from '@/hooks/useBPOCadastro';
import { fetchById, create, update } from '@/services/bpo/cadastro/produtosService';
import { fetchAll as fetchCategorias } from '@/services/bpo/cadastro/categoriasService';

const ProdutosForm = ({ clientId }) => {
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
      sku: '',
      categoria_id: '',
      preco_venda: 0,
      ativo: true,
    }
  });

  useEffect(() => {
    loadCategorias();
    if (isEdit) {
      loadProduto();
    }
  }, [isEdit, id]);

  const loadCategorias = async () => {
    const { data, error } = await fetchCategorias(clientId);
    if (!error && data) {
      setCategorias(data);
    }
  };

  const loadProduto = async () => {
    setLoading(true);
    const { data, error } = await fetchById(clientId, id);
    setLoading(false);

    if (error) {
      showError('Erro ao carregar produto');
      navigate(`/cliente/${clientId}/cadastro/produtos`);
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
      showError(`Erro ao ${isEdit ? 'atualizar' : 'criar'} produto`);
      return;
    }

    showSuccess(`Produto ${isEdit ? 'atualizado' : 'criado'} com sucesso`);
    
    if (!isEdit) {
      reset();
    }
    
    navigate(`/cliente/${clientId}/cadastro/produtos`);
  };

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Editar' : 'Novo'} Produto - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/cliente/${clientId}/cadastro/produtos`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? 'Editar' : 'Novo'} Produto
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="sku">Código/SKU *</Label>
                  <Input
                    id="sku"
                    {...register('sku', { required: 'Código é obrigatório' })}
                    className={errors.sku ? 'border-destructive' : ''}
                  />
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria_id">Categoria</Label>
                  <Select
                    value={watch('categoria_id')}
                    onValueChange={(value) => setValue('categoria_id', value)}
                  >
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preco_venda">Preço *</Label>
                  <Input
                    id="preco_venda"
                    type="number"
                    step="0.01"
                    {...register('preco_venda', { 
                      required: 'Preço é obrigatório',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Preço deve ser maior ou igual a 0' }
                    })}
                    className={errors.preco_venda ? 'border-destructive' : ''}
                  />
                  {errors.preco_venda && (
                    <p className="text-sm text-destructive">{errors.preco_venda.message}</p>
                  )}
                </div>
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
              onClick={() => navigate(`/cliente/${clientId}/cadastro/produtos`)}
            >
              Voltar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ProdutosForm;