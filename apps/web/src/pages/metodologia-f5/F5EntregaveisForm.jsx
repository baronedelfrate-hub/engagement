import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const F5EntregaveisForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [etapas, setEtapas] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.f5Etapas.list({ limit: 100 });
        if (res.success) setEtapas(res.data.map(e => ({ label: e.nome, value: e.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.f5Entregaveis.read(id).then(res => {
        if (res.success) setInitialData(res.data);
        else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        setLoading(false);
      });
    }
  }, [id, toast]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
        const res = id 
            ? await erpServices.f5Entregaveis.update(id, formData) 
            : await erpServices.f5Entregaveis.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Entregável salvo.', variant: 'success' });
          navigate('/metodologia-f5/entregaveis');
        } else {
          toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }
    } catch(e) {
        toast({ title: 'Erro', description: 'Erro de conexão.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const fields = [
    { name: 'nome', label: 'Nome do Entregável', required: true, fullWidth: true },
    { name: 'etapa_id', label: 'Etapa F5', type: 'select', options: etapas, required: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'data_entrega', label: 'Data de Entrega', type: 'date', required: true },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [{ label: 'Planejado', value: 'Planejado' }, { label: 'Em Desenvolvimento', value: 'Em Desenvolvimento' }, { label: 'Entregue', value: 'Entregue' }, { label: 'Aprovado', value: 'Aprovado' }]
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Entregável" : "Novo Entregável"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/metodologia-f5/entregaveis')}
      />
    </div>
  );
};

export default F5EntregaveisForm;