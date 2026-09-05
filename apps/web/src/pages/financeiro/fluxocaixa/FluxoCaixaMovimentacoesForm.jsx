import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';

const FluxoCaixaMovimentacoesForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  
  // Use centralized hook
  const { categorias, centrosCusto, empresas, loading: loadingDropdowns } = useFinanceiroDropdowns();

  useEffect(() => {
    if (id) {
      setLoading(true);
      const fetchData = async () => {
          const { data, error } = await supabase.from('fluxo_caixa_movimentacoes').select('*').eq('id', id).single();
          if (error) {
              toast({ title: 'Erro', description: error.message, variant: 'destructive' });
          } else {
              setInitialData(data);
          }
          setLoading(false);
      };
      fetchData();
    }
  }, [id, toast]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
        const payload = {
            ...formData,
            // Ensure numbers are numbers
            valor: parseFloat(formData.valor)
        };

        const { error } = id 
            ? await supabase.from('fluxo_caixa_movimentacoes').update(payload).eq('id', id)
            : await insertWithCompanyId('fluxo_caixa_movimentacoes', payload);

        if (!error) {
          toast({ title: 'Sucesso', description: 'Movimentação salva.', variant: 'success' });
          navigate('/financeiro/fluxo-caixa/movimentacoes');
        } else {
          toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    } catch(e) {
        toast({ title: 'Erro', description: 'Erro de conexão.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  const fields = [
    { name: 'data_movimentacao', label: 'Data', type: 'date', required: true },
    { 
        name: 'tipo', 
        label: 'Tipo', 
        type: 'select', 
        options: [{ label: 'Entrada', value: 'entrada' }, { label: 'Saída', value: 'saida' }],
        required: true 
    },
    { name: 'valor', label: 'Valor', type: 'number', step: '0.01', required: true },
    { 
        name: 'empresa_id', 
        label: 'Empresa', 
        type: 'select', 
        options: empresas.map(e => ({ label: e.nome, value: e.id })), 
        required: true 
    },
    { 
        name: 'centro_custo_id', 
        label: 'Centro de Custo', 
        type: 'select', 
        options: centrosCusto.map(c => ({ label: c.nome, value: c.id })),
    },
    { name: 'descricao', label: 'Descrição', type: 'textarea', required: true, fullWidth: true },
    { name: 'observacoes', label: 'Observações', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Movimentação" : "Nova Movimentação"}
        fields={fields}
        initialData={initialData}
        loading={loading || loadingDropdowns}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/financeiro/fluxo-caixa/movimentacoes')}
      />
    </div>
  );
};

export default FluxoCaixaMovimentacoesForm;