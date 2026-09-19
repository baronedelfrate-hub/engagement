import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDForm from '@/components/CRUDForm';
import { useToast } from '@/components/ui/use-toast';
import { GRUPOS_DRE_LABELS } from '@/lib/planoContas';

const CategoriasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.categorias.read(id).then(res => {
        if (res.success) setInitialData(res.data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    // Código vazio vai como null: '' colidiria no índice único (empresa, código) entre categorias sem código
    const payload = { ...formData, codigo: (formData.codigo || '').trim() || null };
    const res = id
        ? await erpServices.categorias.update(id, payload)
        : await erpServices.categorias.create(payload);

    if (res.success) {
      toast({ title: 'Sucesso', description: 'Categoria salva.', variant: 'success' });
      navigate('/cadastros/categorias');
    }
    setLoading(false);
  };

  const fields = [
    { name: 'codigo', label: 'Código (ex.: 5.1)' },
    { name: 'nome', label: 'Nome da Categoria', required: true, fullWidth: true },
    { name: 'descricao', label: 'Descrição', type: 'textarea', fullWidth: true },
    {
      name: 'grupo_dre',
      label: 'Linha na DRE',
      type: 'select',
      options: Object.entries(GRUPOS_DRE_LABELS).map(([value, label]) => ({ label, value })),
    },
    { name: 'ativo', label: 'Ativo', type: 'boolean' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDForm
        title={id ? "Editar Categoria" : "Nova Categoria"}
        fields={fields}
        initialData={initialData}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/cadastros/categorias')}
      />
    </div>
  );
};

export default CategoriasForm;