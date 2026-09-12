import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const RHBeneficiosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      supabase.from('rh_beneficios').select('*').eq('id', id).single().then(({ data, error }) => {
        if (error) toast({ title: 'Erro', description: 'Benefício não encontrado.', variant: 'destructive' });
        else setInitialData(data);
        setLoading(false);
      });
    }
  }, [id, toast]);

  const handleSubmit = async (formData) => {
    if (!formData.nome_beneficio || !formData.data_inicio) {
      toast({ title: 'Erro', description: 'Preencha Nome do Benefício e Data Início.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const payload = {
      nome_beneficio: formData.nome_beneficio,
      tipo: formData.tipo || null,
      valor: formData.valor,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      ativo: formData.ativo,
    };

    const { error } = id
      ? await supabase.from('rh_beneficios').update(payload).eq('id', id)
      : await supabase.from('rh_beneficios').insert(payload);

    if (error) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Benefício salvo.', variant: 'success' });
      navigate('/rh/beneficios');
    }
    setLoading(false);
  };

  const fields = [
    { name: 'nome_beneficio', label: 'Nome do Benefício', required: true, fullWidth: true },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { label: 'Transporte', value: 'Transporte' },
        { label: 'Alimentação', value: 'Alimentação' },
        { label: 'Saúde', value: 'Saúde' },
        { label: 'Outro', value: 'Outro' },
      ],
    },
    { name: 'valor', label: 'Valor (R$)', type: 'number', step: '0.01' },
    { name: 'data_inicio', label: 'Data Início', type: 'date', required: true },
    { name: 'data_fim', label: 'Data Fim', type: 'date' },
    { name: 'ativo', label: 'Ativo', type: 'switch' },
  ];

  return (
    <div className="p-6">
      <CRUDForm
        title={id ? 'Editar Benefício' : 'Novo Benefício'}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/rh/beneficios')}
      />
    </div>
  );
};

export default RHBeneficiosForm;
