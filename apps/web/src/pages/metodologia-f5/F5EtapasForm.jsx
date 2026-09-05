import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const F5EtapasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.f5Projetos.list({ limit: 100 });
        if (res.success) setProjetos(res.data.map(p => ({ label: p.nome, value: p.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.f5Etapas.read(id).then(res => {
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
            ? await erpServices.f5Etapas.update(id, formData) 
            : await erpServices.f5Etapas.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Etapa salva.', variant: 'success' });
          navigate('/metodologia-f5/etapas');
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
    { name: 'nome', label: 'Nome da Etapa', required: true, fullWidth: true },
    { name: 'projeto_f5_id', label: 'Projeto F5', type: 'select', options: projetos, required: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'data_inicio', label: 'Data Início', type: 'date', required: true },
    { name: 'data_fim', label: 'Data Fim', type: 'date' },
    { 
        name: 'status', 
        label: 'Status', 
        type: 'select', 
        options: [{ label: 'Planejado', value: 'planejado' }, { label: 'Em Andamento', value: 'em_andamento' }, { label: 'Concluído', value: 'concluido' }] 
    },
    { name: 'responsavel', label: 'Responsável', type: 'text' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Etapa" : "Nova Etapa F5"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/metodologia-f5/etapas')}
      />
    </div>
  );
};

export default F5EtapasForm;