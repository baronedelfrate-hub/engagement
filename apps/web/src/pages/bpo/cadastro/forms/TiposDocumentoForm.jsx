import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBPOCadastro } from '@/hooks/useBPOCadastro';
import { fetchById, create, update } from '@/services/bpo/cadastro/tiposDocumentoService';

const TiposDocumentoForm = ({ clientId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  const isEdit = mode === 'edit' && id;

  const { loading, setLoading, showSuccess, showError } = useBPOCadastro();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      nome: '',
      sigla: '',
      descricao: '',
      ativo: true,
    }
  });

  useEffect(() => {
    if (isEdit) {
      loadTipoDocumento();
    }
  }, [isEdit, id]);

  const loadTipoDocumento = async () => {
    setLoading(true);
    const { data, error } = await fetchById(clientId, id);
    setLoading(false);

    if (error) {
      showError('Erro ao carregar tipo de documento');
      navigate(`/cliente/${clientId}/cadastro/tipos-documento`);
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
      showError(`Erro ao ${isEdit ? 'atualizar' : 'criar'} tipo de documento`);
      return;
    }

    showSuccess(`Tipo de documento ${isEdit ? 'atualizado' : 'criado'} com sucesso`);
    
    if (!isEdit) {
      reset();
    }
    
    navigate(`/cliente/${clientId}/cadastro/tipos-documento`);
  };

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Editar' : 'Novo'} Tipo de Documento - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-documento`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? 'Editar' : 'Novo'} Tipo de Documento
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Tipo de Documento</CardTitle>
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
                  <Label htmlFor="sigla">Sigla *</Label>
                  <Input
                    id="sigla"
                    {...register('sigla', { required: 'Sigla é obrigatória' })}
                    className={errors.sigla ? 'border-destructive' : ''}
                  />
                  {errors.sigla && (
                    <p className="text-sm text-destructive">{errors.sigla.message}</p>
                  )}
                </div>
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
              onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-documento`)}
            >
              Voltar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default TiposDocumentoForm;