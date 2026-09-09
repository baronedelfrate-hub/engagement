import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';

const CategoriasList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.categorias.list({});
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { 
      header: 'Nome', 
      accessorKey: 'nome', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'Descrição', 
      accessorKey: 'descricao',
      cell: ({ row }) => <span className="text-foreground">{row.descricao}</span>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      <CRUDTable
        title={<span className="text-foreground">Categorias de Produtos/Serviços</span>}
        columns={columns}
        data={data}
        loading={loading}
        onCreate={() => navigate('/cadastros/categorias/novo')}
        onEdit={(row) => navigate(`/cadastros/categorias/${row.id}`)}
        onDelete={async (id) => { await erpServices.categorias.delete(id); fetchData(); }}
        pagination={{ page: 1, limit: 100, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
      />
    </div>
  );
};

export default CategoriasList;