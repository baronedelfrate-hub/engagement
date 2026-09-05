import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const MovimentacoesFinanceirasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const [contasRes, catRes] = await Promise.all([
            erpServices.bancos.list({ limit: 100 }),
            erpServices.fluxoCaixaConfigCategorias.list({ limit: 100 })
        ]);
        
        if (contasRes.success) setContas(contasRes.data.map(c => ({ label: c.nome_conta, value: c.id })));
        if (catRes.success) setCategorias(catRes.data.map(c => ({ label: c.nome, value: c.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.movimentacoesFinanceiras.read(id).then(res => {
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
            ? await erpServices.movimentacoesFinanceiras.update(id, formData) 
            : await erpServices.movimentacoesFinanceiras.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Movimentação salva.', variant: 'success' });
          navigate('/financeiro/movimentacoes');
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
    { name: 'descricao', label: 'Descrição da Movimentação', required: true, fullWidth: true },
    { 
        name: 'tipo', 
        label: 'Tipo', 
        type: 'select', 
        options: [{ label: 'Entrada (Crédito)', value: 'entrada' }, { label: 'Saída (Débito)', value: 'saida' }],
        required: true 
    },
    { name: 'valor', label: 'Valor', type: 'number', step: '0.01', required: true },
    { name: 'data_movimento', label: 'Data do Movimento', type: 'date', required: true },
    { name: 'conta_id', label: 'Conta Bancária', type: 'select', options: contas, required: true },
    { name: 'categoria_id', label: 'Categoria Financeira', type: 'select', options: categorias },
    { name: 'observacoes', label: 'Observações', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Movimentação" : "Nova Movimentação Financeira"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/financeiro/movimentacoes')}
      />
    </div>
  );
};

export default MovimentacoesFinanceirasForm;