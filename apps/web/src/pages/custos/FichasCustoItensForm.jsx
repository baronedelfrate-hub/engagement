import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const FichasCustoItensForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [fichas, setFichas] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.fichasCusto.list({ limit: 100 });
        if (res.success) setFichas(res.data.map(f => ({ label: f.descricao, value: f.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.fichasCustoItens.read(id).then(res => {
        if (res.success) setInitialData(res.data);
        else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        setLoading(false);
      });
    }
  }, [id, toast]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    // Auto-calc total
    const payload = {
        ...formData,
        valor_total: (parseFloat(formData.quantidade) || 0) * (parseFloat(formData.valor_unitario) || 0)
    };

    try {
        const res = id 
            ? await erpServices.fichasCustoItens.update(id, payload) 
            : await erpServices.fichasCustoItens.create(payload);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Item salvo.', variant: 'success' });
          navigate('/custos/fichas-custo-itens');
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
    { name: 'ficha_custo_id', label: 'Ficha de Custo', type: 'select', options: fichas, required: true },
    { name: 'descricao', label: 'Descrição do Item', required: true, fullWidth: true },
    { name: 'quantidade', label: 'Quantidade', type: 'number', required: true },
    { name: 'valor_unitario', label: 'Valor Unitário', type: 'number', step: '0.01', required: true },
    { name: 'observacoes', label: 'Observações', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Item de Custo" : "Novo Item de Custo"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/custos/fichas-custo-itens')}
      />
    </div>
  );
};

export default FichasCustoItensForm;