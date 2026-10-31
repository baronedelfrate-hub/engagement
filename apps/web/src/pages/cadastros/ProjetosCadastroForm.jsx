import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';

const STATUS = ['Planejamento', 'Em Andamento', 'Pausado', 'Concluído', 'Cancelado'];

// Cadastro prévio de projeto para o controle financeiro: só o nome é obrigatório.
const ProjetosCadastroForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({ status: 'Em Andamento' });

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.projetos.read(id).then((res) => {
        if (res.success) setInitialData(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    const payload = {
      nome: (formData.nome || '').trim(),
      codigo: (formData.codigo || '').trim() || null,
      descricao: formData.descricao || null,
      status: formData.status || 'Em Andamento',
      data_inicio: formData.data_inicio || null,
      data_fim: formData.data_fim || null,
      orcamento: formData.orcamento === '' || formData.orcamento == null ? null : Number(formData.orcamento)
    };
    const res = id ? await erpServices.projetos.update(id, payload) : await erpServices.projetos.create(payload);
    if (res.success) {
      toast({ title: 'Sucesso', description: 'Projeto salvo.', variant: 'success' });
      navigate('/cadastros/projetos');
    } else {
      toast({ title: 'Erro', description: res.error || 'Não foi possível salvar o projeto.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const fields = [
    { name: 'codigo', label: 'Código (opcional)' },
    { name: 'nome', label: 'Nome do projeto', required: true, fullWidth: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    { name: 'status', label: 'Situação', type: 'select', options: STATUS.map((s) => ({ label: s, value: s })) },
    { name: 'orcamento', label: 'Orçamento (R$)', type: 'number' },
    { name: 'data_inicio', label: 'Início', type: 'date' },
    { name: 'data_fim', label: 'Fim previsto', type: 'date' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? 'Editar Projeto' : 'Novo Projeto'}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/cadastros/projetos')}
      />
    </div>
  );
};

export default ProjetosCadastroForm;
