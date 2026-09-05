import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const PedidosItensForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const [pedidosRes, produtosRes] = await Promise.all([
            erpServices.pedidosVenda.list({ limit: 100 }),
            erpServices.produtos.list({ limit: 100 })
        ]);
        
        if (pedidosRes.success) setPedidos(pedidosRes.data.map(p => ({ label: `Pedido #${p.numero}`, value: p.id })));
        if (produtosRes.success) setProdutos(produtosRes.data.map(p => ({ label: p.nome, value: p.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.pedidosVendaItens.read(id).then(res => {
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
            ? await erpServices.pedidosVendaItens.update(id, formData) 
            : await erpServices.pedidosVendaItens.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Item salvo.', variant: 'success' });
          navigate('/vendas/pedidos-itens');
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
    { name: 'pedido_id', label: 'Pedido', type: 'select', options: pedidos, required: true },
    { name: 'produto_id', label: 'Produto', type: 'select', options: produtos, required: true },
    { name: 'quantidade', label: 'Quantidade', type: 'number', required: true },
    { name: 'valor_unitario', label: 'Valor Unitário', type: 'number', step: '0.01', required: true },
    { name: 'valor_total', label: 'Valor Total', type: 'number', step: '0.01', required: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      <CRUDForm
        title={id ? "Editar Item de Pedido" : "Novo Item de Pedido"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vendas/pedidos-itens')}
      />
    </div>
  );
};

export default PedidosItensForm;