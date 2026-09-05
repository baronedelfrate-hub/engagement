import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const FuncionariosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.funcionarios.read(id).then(res => {
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
            ? await erpServices.funcionarios.update(id, formData) 
            : await erpServices.funcionarios.create(formData);

        if (res.success) {
          toast({ title: 'Sucesso', description: 'Funcionário salvo.', variant: 'success' });
          navigate('/rh/funcionarios');
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
    { name: 'nome', label: 'Nome Completo', required: true, fullWidth: true },
    { name: 'cpf', label: 'CPF', required: true },
    { name: 'email', label: 'Email Corporativo', type: 'email' },
    { name: 'cargo', label: 'Cargo', required: true },
    { name: 'departamento', label: 'Departamento', required: true },
    { name: 'data_admissao', label: 'Data de Admissão', type: 'date', required: true },
    { name: 'salario_base', label: 'Salário Base', type: 'number', step: '0.01' },
    { 
        name: 'status', 
        label: 'Status', 
        type: 'select', 
        options: [
            { label: 'Ativo', value: 'ativo' },
            { label: 'Férias', value: 'ferias' },
            { label: 'Afastado', value: 'afastado' },
            { label: 'Desligado', value: 'desligado' }
        ] 
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Funcionário" : "Novo Funcionário"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/rh/funcionarios')}
      />
    </div>
  );
};

export default FuncionariosForm;