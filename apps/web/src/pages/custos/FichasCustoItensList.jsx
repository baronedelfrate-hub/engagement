import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';

const FichasCustoItensList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, fichasRes] = await Promise.all([
      erpServices.fichasCustoItens.list({ limit: 50 }),
      erpServices.fichasCusto.list({ limit: 100 })
    ]);
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    if (fichasRes.success) setFichas(fichasRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getFichaNumero = (id) => fichas.find(f => f.id === id)?.numero || '-';

  const columns = [
    { header: 'Ficha', cell: ({ row }) => getFichaNumero(row.ficha_id) },
    { header: 'Descrição', accessorKey: 'descricao' },
    { header: 'Qtd', accessorKey: 'quantidade' },
    { header: 'Valor Unit.', accessorKey: 'valor_unitario', cell: ({ row }) => `R$ ${parseFloat(row.valor_unitario).toFixed(2)}` },
    { header: 'Total', accessorKey: 'valor_total', cell: ({ row }) => `R$ ${parseFloat(row.valor_total).toFixed(2)}` },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Itens de Custo"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/custos/fichas-custo-itens/novo')}
        onEdit={(row) => navigate(`/custos/fichas-custo-itens/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.fichasCustoItens.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default FichasCustoItensList;