import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const FluxoCaixaConfigCategoriasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.fluxoCaixaConfigCategorias.read(id).then(res => {
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
            ? await erpServices.fluxoCaixaConfigCategorias.update(id, formData) 
            : await erpServices.fluxoCaixaConfigCategorias.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Categoria salva.', variant: 'success' });
          navigate('/financeiro/fluxo-caixa/config-categorias');
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
    { name: 'nome', label: 'Nome da Categoria', required: true, fullWidth: true },
    { 
        name: 'tipo', 
        label: 'Tipo', 
        type: 'select', 
        options: [{ label: 'Receita', value: 'receita' }, { label: 'Despesa', value: 'despesa' }],
        required: true 
    },
    { name: 'cor', label: 'Cor (Hex)', placeholder: '#000000' },
    { name: 'ativo', label: 'Ativo', type: 'switch' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Categoria" : "Nova Categoria"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/financeiro/fluxo-caixa/config-categorias')}
      />
    </div>
  );
};

export default FluxoCaixaConfigCategoriasForm;