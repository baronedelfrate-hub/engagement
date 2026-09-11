import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const F5ProjetosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.users.list({ limit: 100 });
        if (res.success) setUsuarios(res.data.map(u => ({ label: u.nome, value: u.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.f5Projetos.read(id).then(res => {
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
            ? await erpServices.f5Projetos.update(id, formData) 
            : await erpServices.f5Projetos.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Projeto F5 salvo.', variant: 'success' });
          navigate('/metodologia-f5/projetos');
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
    { name: 'nome', label: 'Nome do Projeto', required: true, fullWidth: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'data_inicio', label: 'Data Início', type: 'date', required: true },
    { name: 'data_fim', label: 'Data Fim (Previsão)', type: 'date' },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [{ label: 'Planejado', value: 'Planejado' }, { label: 'Em Andamento', value: 'Em Andamento' }, { label: 'Concluído', value: 'Concluído' }, { label: 'Pausado', value: 'Pausado' }]
    },
    { name: 'responsavel_id', label: 'Consultor Responsável', type: 'select', options: usuarios },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Projeto F5" : "Novo Projeto F5"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/metodologia-f5/projetos')}
      />
    </div>
  );
};

export default F5ProjetosForm;