import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBPOCadastro } from '@/hooks/useBPOCadastro';
import { fetchById, create, update } from '@/services/bpo/cadastro/empresasService';

const EmpresasForm = ({ clientId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  const isEdit = mode === 'edit' && id;

  const { loading, setLoading, showSuccess, showError } = useBPOCadastro();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      razao_social: '',
      cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      ativo: true,
    }
  });

  useEffect(() => {
    if (isEdit) {
      loadEmpresa();
    }
  }, [isEdit, id]);

  const loadEmpresa = async () => {
    setLoading(true);
    const { data, error } = await fetchById(clientId, id);
    setLoading(false);

    if (error) {
      showError('Erro ao carregar empresa');
      navigate(`/cliente/${clientId}/cadastro/empresas`);
      return;
    }

    if (data) {
      Object.keys(data).forEach(key => {
        setValue(key, data[key]);
      });
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const { error } = isEdit 
      ? await update(clientId, id, data)
      : await create(clientId, data);
    setLoading(false);

    if (error) {
      showError(`Erro ao ${isEdit ? 'atualizar' : 'criar'} empresa`);
      return;
    }

    showSuccess(`Empresa ${isEdit ? 'atualizada' : 'criada'} com sucesso`);
    
    if (!isEdit) {
      reset();
    }
    
    navigate(`/cliente/${clientId}/cadastro/empresas`);
  };

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Editar' : 'Nova'} Empresa - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/cliente/${clientId}/cadastro/empresas`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? 'Editar' : 'Nova'} Empresa
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    {...register('razao_social', { required: 'Razão Social é obrigatória' })}
                    className={errors.razao_social ? 'border-destructive' : ''}
                  />
                  {errors.razao_social && (
                    <p className="text-sm text-destructive">{errors.razao_social.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                    className={errors.cnpj ? 'border-destructive' : ''}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-destructive">{errors.cnpj.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Email inválido'
                      }
                    })}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" {...register('telefone')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" {...register('endereco')} />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="ativo"
                  checked={watch('ativo')}
                  onCheckedChange={(checked) => setValue('ativo', checked)}
                />
                <Label htmlFor="ativo">Ativo</Label>
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
              onClick={() => navigate(`/cliente/${clientId}/cadastro/empresas`)}
            >
              Voltar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EmpresasForm;