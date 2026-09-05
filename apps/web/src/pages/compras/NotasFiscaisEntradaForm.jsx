import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const NotasFiscaisEntradaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});
  const [fornecedores, setFornecedores] = useState([]);

  useEffect(() => {
    const loadDependencies = async () => {
        const res = await erpServices.fornecedores.list({ limit: 100 });
        if (res.success) setFornecedores(res.data.map(p => ({ label: p.nome, value: p.id })));
    };
    loadDependencies();

    if (id) {
      setLoading(true);
      erpServices.notasFiscaisEntrada.read(id).then(res => {
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
            ? await erpServices.notasFiscaisEntrada.update(id, formData) 
            : await erpServices.notasFiscaisEntrada.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Nota Fiscal salva.', variant: 'success' });
          navigate('/compras/notas-fiscais-entrada');
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
    { name: 'numero', label: 'Número da Nota', required: true },
    { name: 'serie', label: 'Série', required: true },
    { name: 'chave_acesso', label: 'Chave de Acesso (44 dígitos)', fullWidth: true },
    { name: 'fornecedor_id', label: 'Fornecedor', type: 'select', options: fornecedores, required: true },
    { name: 'data_emissao', label: 'Data de Emissão', type: 'date', required: true },
    { name: 'data_entrada', label: 'Data de Entrada', type: 'date', required: true },
    { name: 'valor_total', label: 'Valor Total', type: 'number', step: '0.01', required: true },
    { 
        name: 'status', 
        label: 'Status', 
        type: 'select', 
        options: [
            { label: 'Pendente', value: 'pendente' },
            { label: 'Processada', value: 'processada' },
            { label: 'Cancelada', value: 'cancelada' }
        ] 
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Nota Fiscal de Entrada" : "Nova Nota Fiscal de Entrada"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/compras/notas-fiscais-entrada')}
      />
    </div>
  );
};

export default NotasFiscaisEntradaForm;