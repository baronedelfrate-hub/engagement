import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBankName } from '@/lib/febrabanBanks';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { usoDoLimite } from '@/lib/bancoLimite';

const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const BancosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [saldosExtrato, setSaldosExtrato] = useState({}); // último saldo registrado no extrato de cada banco
  
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

  // saldo atual = último saldo do extrato importado; sem extrato, vale o saldo cadastrado
  useEffect(() => {
    let ativo = true;
    (async () => {
      const mapa = {};
      await Promise.all(data.map(async (b) => {
        const { data: l } = await supabase.from('extrato_bancario').select('saldo_posterior').eq('banco_id', b.id).not('saldo_posterior', 'is', null).order('data_transacao', { ascending: false }).order('created_at', { ascending: false }).limit(1);
        if (l?.[0]) mapa[b.id] = Number(l[0].saldo_posterior);
      }));
      if (ativo) setSaldosExtrato(mapa);
    })();
    return () => { ativo = false; };
  }, [data]);

  const saldoDe = (row) => (saldosExtrato[row.id] !== undefined ? saldosExtrato[row.id] : Number(row.saldo) || 0);

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
        cell: ({ row }) => {
          const saldo = saldoDe(row);
          const u = usoDoLimite(saldo, row.limite);
          return (
            <div className="flex flex-col">
              <span className={saldo < 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{brl(saldo)}</span>
              {u.usando && (
                <Badge variant="outline" className={`mt-1 w-fit text-[11px] ${u.estourou ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'}`}>
                  {u.estourou ? (u.limite > 0 ? `Passou do limite (+${brl(u.excedido)})` : 'Negativo sem limite cadastrado') : `Usando limite: ${brl(u.usado)}`}
                </Badge>
              )}
            </div>
          );
        }
    },
    {
        header: 'Limite',
        accessorKey: 'limite',
        cell: ({ row }) => {
          const l = Number(row.limite) || 0;
          if (l <= 0) return <span className="text-muted-foreground text-sm">—</span>;
          const u = usoDoLimite(saldoDe(row), l);
          return (
            <div className="flex flex-col text-sm text-foreground">
              <span>{brl(l)}</span>
              <span className="text-xs text-muted-foreground">{u.usando ? `${u.percentual != null ? `${u.percentual.toLocaleString('pt-BR')}% em uso · ` : ''}livre ${brl(u.restante)}` : 'sem uso'}</span>
            </div>
          );
        }
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