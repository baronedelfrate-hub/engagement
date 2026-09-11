import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const F5KPIsForm = () => {
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
      erpServices.f5Kpis.read(id).then(res => {
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
            ? await erpServices.f5Kpis.update(id, formData) 
            : await erpServices.f5Kpis.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'KPI salvo.', variant: 'success' });
          navigate('/metodologia-f5/kpis');
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
    { name: 'nome', label: 'Nome do Indicador', required: true, fullWidth: true },
    { name: 'projeto_id', label: 'Projeto F5', type: 'select', options: projetos, required: true },
    { name: 'valor_meta', label: 'Meta', type: 'number', step: '0.01' },
    { name: 'valor_atual', label: 'Valor Atual', type: 'number', step: '0.01' },
    { name: 'unidade', label: 'Unidade', placeholder: 'Ex: %, R$, un' },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar KPI F5" : "Novo KPI F5"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/metodologia-f5/kpis')}
      />
    </div>
  );
};

export default F5KPIsForm;