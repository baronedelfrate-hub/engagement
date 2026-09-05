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
import { fetchById, create, update } from '@/services/bpo/cadastro/bancosService';

const BancosForm = ({ clientId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  const isEdit = mode === 'edit' && id;

  const { loading, setLoading, showSuccess, showError } = useBPOCadastro();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      codigo: '',
      nome: '',
      agencia: '',
      conta: '',
      tipo_conta: 'CORRENTE',
      saldo: 0,
      ativo: true,
    }
  });

  useEffect(() => {
    if (isEdit) {
      loadBanco();
    }
  }, [isEdit, id]);

  const loadBanco = async () => {
    setLoading(true);
    const { data, error } = await fetchById(clientId, id);
    setLoading(false);

    if (error) {
      showError('Erro ao carregar banco');
      navigate(`/cliente/${clientId}/cadastro/bancos`);
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
      showError(`Erro ao ${isEdit ? 'atualizar' : 'criar'} banco`);
      return;
    }

    showSuccess(`Banco ${isEdit ? 'atualizado' : 'criado'} com sucesso`);
    navigate(`/cliente/${clientId}/cadastro/bancos`);
  };

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Editar' : 'Novo'} Banco - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/cliente/${clientId}/cadastro/bancos`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? 'Editar' : 'Novo'} Banco
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Banco</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    {...register('codigo', { required: 'Código é obrigatório' })}
                    className={errors.codigo ? 'border-destructive' : ''}
                  />
                  {errors.codigo && (
                    <p className="text-sm text-destructive">{errors.codigo.message}</p>
                  )}
                </div>

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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input id="agencia" {...register('agencia')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conta">Conta</Label>
                  <Input id="conta" {...register('conta')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                  <Select
                    value={watch('tipo_conta')}
                    onValueChange={(value) => setValue('tipo_conta', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CORRENTE">Corrente</SelectItem>
                      <SelectItem value="POUPANCA">Poupança</SelectItem>
                      <SelectItem value="INVESTIMENTO">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saldo">Saldo Inicial</Label>
                <Input
                  id="saldo"
                  type="number"
                  step="0.01"
                  {...register('saldo', { valueAsNumber: true })}
                />
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
              onClick={() => navigate(`/cliente/${clientId}/cadastro/bancos`)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BancosForm;