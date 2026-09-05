import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const CentroCustosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.centrosCusto.read(id).then(res => {
        if (res.success) setInitialData(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    const res = id 
        ? await erpServices.centrosCusto.update(id, formData) 
        : await erpServices.centrosCusto.create(formData);

    if (res.success) {
      toast({ title: 'Sucesso', description: 'Salvo com sucesso.', variant: 'success' });
      navigate('/cadastros/centro-custos');
    }
    setLoading(false);
  };

  const fields = [
    { name: 'codigo', label: 'Código (Ex: 01.01)', required: true },
    { name: 'nome', label: 'Nome do Centro de Custo', required: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'ativo', label: 'Ativo', type: 'boolean' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Centro de Custo" : "Novo Centro de Custo"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/cadastros/centro-custos')}
      />
    </div>
  );
};

export default CentroCustosForm;