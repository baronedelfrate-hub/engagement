import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const FichasCustoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.fichasCusto.read(id).then(res => {
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
            ? await erpServices.fichasCusto.update(id, formData) 
            : await erpServices.fichasCusto.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Ficha salva.', variant: 'success' });
          navigate('/custos/fichas-custo');
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
    { name: 'codigo', label: 'Código da Ficha', required: true },
    { name: 'descricao', label: 'Descrição', required: true, fullWidth: true },
    { name: 'data_vigencia', label: 'Data de Vigência', type: 'date', required: true },
    { name: 'status', label: 'Ativo', type: 'select', options: [{ label: 'Ativo', value: 'ativo' }, { label: 'Inativo', value: 'inativo' }] },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Ficha de Custo" : "Nova Ficha de Custo"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/custos/fichas-custo')}
      />
    </div>
  );
};

export default FichasCustoForm;