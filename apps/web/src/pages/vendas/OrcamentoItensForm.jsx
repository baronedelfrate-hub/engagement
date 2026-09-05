import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const OrcamentoItensForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [orcamentos, setOrcamentos] = useState([]);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const [orcRes, prodRes] = await Promise.all([
            erpServices.orcamentos.list({ limit: 100 }),
            erpServices.produtos.list({ limit: 100 })
        ]);
        
        if (orcRes.success) setOrcamentos(orcRes.data.map(p => ({ label: `Orçamento #${p.numero}`, value: p.id })));
        if (prodRes.success) setProdutos(prodRes.data.map(p => ({ label: p.nome, value: p.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.orcamentoItens.read(id).then(res => {
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
            ? await erpServices.orcamentoItens.update(id, formData) 
            : await erpServices.orcamentoItens.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Item salvo.', variant: 'success' });
          navigate('/vendas/orcamento-itens');
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
    { name: 'orcamento_id', label: 'Orçamento', type: 'select', options: orcamentos, required: true },
    { name: 'produto_id', label: 'Produto', type: 'select', options: produtos, required: true },
    { name: 'quantidade', label: 'Quantidade', type: 'number', required: true },
    { name: 'valor_unitario', label: 'Valor Unitário', type: 'number', step: '0.01', required: true },
    { name: 'valor_total', label: 'Valor Total', type: 'number', step: '0.01', required: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      <CRUDForm
        title={id ? "Editar Item de Orçamento" : "Novo Item de Orçamento"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vendas/orcamento-itens')}
      />
    </div>
  );
};

export default OrcamentoItensForm;