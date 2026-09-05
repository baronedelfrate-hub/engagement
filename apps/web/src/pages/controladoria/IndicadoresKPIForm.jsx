import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const IndicadoresKPIForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.indicadoresKpi.read(id).then(res => {
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
            ? await erpServices.indicadoresKpi.update(id, formData) 
            : await erpServices.indicadoresKpi.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'KPI salvo.', variant: 'success' });
          navigate('/controladoria/indicadores-kpi');
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
    { name: 'nome', label: 'Nome do Indicador', required: true, fullWidth: true },
    { name: 'formula', label: 'Fórmula de Cálculo', type: 'textarea', fullWidth: true },
    { name: 'meta', label: 'Meta Alvo', type: 'number', step: '0.01' },
    { name: 'valor_atual', label: 'Valor Atual', type: 'number', step: '0.01' },
    { 
        name: 'status', 
        label: 'Status', 
        type: 'select', 
        options: [
            { label: 'Na Meta', value: 'on_track' },
            { label: 'Em Risco', value: 'at_risk' },
            { label: 'Fora da Meta', value: 'off_track' }
        ]
    },
    { name: 'ativo', label: 'Ativo', type: 'switch' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar KPI" : "Novo Indicador KPI"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/controladoria/indicadores-kpi')}
      />
    </div>
  );
};

export default IndicadoresKPIForm;