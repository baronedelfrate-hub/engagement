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
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.clientes.list({ limit: 100 });
        if (res.success) setClientes(res.data.map(c => ({ label: c.nome_fantasia || c.razao_social, value: c.id })));
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
    { name: 'cliente_id', label: 'Cliente', type: 'select', options: clientes, required: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'data_inicio', label: 'Data Início', type: 'date', required: true },
    { 
        name: 'fase_atual', 
        label: 'Fase Atual', 
        type: 'select', 
        options: [{ label: 'F1 - Diagnóstico', value: 'F1' }, { label: 'F2 - Estruturação', value: 'F2' }, { label: 'F3 - Acompanhamento', value: 'F3' }, { label: 'F4 - Planejamento', value: 'F4' }, { label: 'F5 - Governança', value: 'F5' }] 
    },
    { name: 'responsavel', label: 'Consultor Responsável', type: 'text' },
    { name: 'ativo', label: 'Ativo', type: 'switch' },
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