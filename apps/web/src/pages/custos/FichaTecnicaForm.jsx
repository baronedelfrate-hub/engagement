import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const FichaTecnicaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.produtos.list({ limit: 200 });
        if (res.success) setProdutos(res.data.map(p => ({ label: `${p.nome}${p.sku ? ' (' + p.sku + ')' : ''}`, value: p.id })));
    };
    loadDependencies();

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
          toast({ title: 'Sucesso', description: 'Ficha técnica salva.', variant: 'success' });
          navigate('/custos/ficha-tecnica');
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
    { name: 'numero', label: 'Número da Ficha', required: true },
    { name: 'produto_id', label: 'Produto', type: 'select', options: produtos, required: true },
    { name: 'data_criacao', label: 'Data de Criação', type: 'date' },
    { name: 'valor_total', label: 'Custo Total (R$)', type: 'number', step: '0.01' },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [{ label: 'Rascunho', value: 'Rascunho' }, { label: 'Ativa', value: 'Ativa' }, { label: 'Inativa', value: 'Inativa' }]
    },
    { name: 'observacoes', label: 'Observações', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/custos/ficha-tecnica')}
      />
    </div>
  );
};

export default FichaTecnicaForm;
