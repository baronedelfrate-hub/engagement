import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const DRELinhasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.dreLinhas.read(id).then(res => {
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
            ? await erpServices.dreLinhas.update(id, formData) 
            : await erpServices.dreLinhas.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Linha salva.', variant: 'success' });
          navigate('/controladoria/dre-linhas');
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
    { name: 'ordem', label: 'Ordem de Exibição', type: 'number', required: true },
    { name: 'codigo', label: 'Código Contábil', required: true },
    { name: 'descricao', label: 'Descrição da Linha', required: true, fullWidth: true },
    { 
        name: 'tipo', 
        label: 'Tipo', 
        type: 'select', 
        options: [
            { label: 'Receita (+)', value: 'receita' },
            { label: 'Despesa (-)', value: 'despesa' },
            { label: 'Resultado (=)', value: 'resultado' }
        ],
        required: true 
    },
    { name: 'ativo', label: 'Ativo', type: 'switch' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Linha DRE" : "Nova Linha DRE"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/controladoria/dre-linhas')}
      />
    </div>
  );
};

export default DRELinhasForm;