import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBankName } from '@/lib/febrabanBanks';
import { Calendar } from 'lucide-react';

const BancosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  
  const fetchData = async (page = 1, searchTerm = search) => {
    setLoading(true);
    const res = await erpServices.bancos.list({
      page,
      limit: pagination.limit,
      search: searchTerm,
      searchColumns: ['nome', 'agencia', 'conta']
    });

    if (res.success) {
      setData(res.data);
      setPagination({ 
        page: res.page, 
        limit: res.limit, 
        total: res.total, 
        totalPages: res.totalPages 
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const columns = [
    { 
      header: 'Banco / Instituição', 
      accessorKey: 'codigo', 
      sortable: true,
      cell: ({ row }) => {
        const bankName = row.codigo ? getBankName(row.codigo) : row.nome;
        return <span className="font-medium text-foreground">{bankName}</span>;
      }
    },
    { 
      header: 'Nome da Conta', 
      accessorKey: 'nome',
      cell: ({ row }) => <span className="text-foreground">{row.nome}</span>
    },
    { 
      header: 'Agência', 
      accessorKey: 'agencia',
      cell: ({ row }) => <span className="text-foreground">{row.agencia}</span>
    },
    { 
      header: 'Conta', 
      accessorKey: 'conta',
      cell: ({ row }) => <span className="text-foreground">{row.conta}</span>
    },
    { 
      header: 'Tipo', 
      accessorKey: 'tipo_conta',
      cell: ({ row }) => <span className="text-foreground">{row.tipo_conta}</span>
    },
    { 
        header: 'Saldo Atual', 
        accessorKey: 'saldo',
        cell: ({ row }) => (
          <span className={row.saldo < 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.saldo || 0)}
          </span>
        )
    },
    { 
        header: 'Data Saldo Inicial', 
        accessorKey: 'data_saldo_inicial',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-foreground">
            {row.data_saldo_inicial ? (
              <>
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{formatDate(row.data_saldo_inicial)}</span>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </div>
        )
    },
    { 
        header: 'Ativo', 
        accessorKey: 'ativo',
        cell: ({ row }) => (
            <Badge variant={row.ativo ? 'success' : 'secondary'} className={row.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30' : 'bg-muted text-foreground'}>
                {row.ativo ? 'Sim' : 'Não'}
            </Badge>
        )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      <CRUDTable
        title={<span className="text-foreground">Contas Bancárias</span>}
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => fetchData(page)}
        onSearch={(term) => { setSearch(term); fetchData(1, term); }}
        onCreate={() => navigate('/cadastros/bancos/novo')}
        onEdit={(row) => navigate(`/cadastros/bancos/${row.id}`)}
        onDelete={async (id) => {
            await erpServices.bancos.delete(id);
            fetchData();
        }}
      />
    </div>
  );
};

export default BancosList;