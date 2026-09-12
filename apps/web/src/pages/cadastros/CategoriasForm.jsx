import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const CategoriasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.categorias.read(id).then(res => {
        if (res.success) setInitialData(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    const res = id 
        ? await erpServices.categorias.update(id, formData) 
        : await erpServices.categorias.create(formData);

    if (res.success) {
      toast({ title: 'Sucesso', description: 'Categoria salva.', variant: 'success' });
      navigate('/cadastros/categorias');
    }
    setLoading(false);
  };

  const fields = [
    { name: 'nome', label: 'Nome da Categoria', required: true, fullWidth: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    {
      name: 'grupo_dre',
      label: 'Grupo no DRE',
      type: 'select',
      options: [
        { label: 'Custo dos Serviços', value: 'custo_servico' },
        { label: 'Despesa Operacional', value: 'despesa_operacional' },
        { label: 'Não Operacional', value: 'nao_operacional' },
      ],
    },
    { name: 'ativo', label: 'Ativo', type: 'boolean' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Categoria" : "Nova Categoria"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/cadastros/categorias')}
      />
    </div>
  );
};

export default CategoriasForm;