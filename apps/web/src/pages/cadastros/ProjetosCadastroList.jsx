import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { buscarTudo } from '@/services/extratoAsaasService';
import CRUDTable from '@/components/CRUDTable';
import { Badge } from '@/components/ui/badge';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Cadastro de projetos usados no controle de entradas e saídas. O resultado vem do extrato bancário classificado
// (o mesmo que alimenta DRE, Ponto de Equilíbrio e Dashboard).
const ProjetosCadastroList = () => {
  const navigate = useNavigate();
  const { company_id, isSuperAdmin } = useAuthContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.projetos.list({});
    if (!res.success) { setLoading(false); return; }
    let totais = new Map();
    try {
      const linhas = await buscarTudo(() => {
        let q = supabase.from('extrato_bancario').select('id, valor, projeto_id').not('projeto_id', 'is', null).order('id');
        if (company_id && !isSuperAdmin) q = q.eq('company_id', company_id);
        return q;
      });
      for (const l of linhas) {
        const t = totais.get(l.projeto_id) || { receitas: 0, despesas: 0 };
        if (Number(l.valor) >= 0) t.receitas += Number(l.valor); else t.despesas += Math.abs(Number(l.valor));
        totais.set(l.projeto_id, t);
      }
    } catch { totais = new Map(); }
    setData(res.data.map((p) => ({ ...p, ...(totais.get(p.id) || { receitas: 0, despesas: 0 }) })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Código', accessorKey: 'codigo', sortable: true, cell: ({ row }) => <span className="text-foreground font-mono text-xs">{row.codigo || '—'}</span> },
    { header: 'Projeto', accessorKey: 'nome', sortable: true, cell: ({ row }) => <span className="text-foreground font-medium">{row.nome}</span> },
    { header: 'Situação', accessorKey: 'status', cell: ({ row }) => <Badge variant="outline">{row.status || '—'}</Badge> },
    { header: 'Entradas', accessorKey: 'receitas', cell: ({ row }) => <span className="text-emerald-600">{brl(row.receitas)}</span> },
    { header: 'Saídas', accessorKey: 'despesas', cell: ({ row }) => <span className="text-red-600">{brl(row.despesas)}</span> },
    {
      header: 'Resultado',
      accessorKey: 'resultado',
      cell: ({ row }) => {
        const r = row.receitas - row.despesas;
        return <span className={`font-medium ${r < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{brl(r)}</span>;
      }
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      <CRUDTable
        title={<span className="text-foreground">Projetos (controle de entradas e saídas)</span>}
        columns={columns}
        data={data}
        loading={loading}
        onCreate={() => navigate('/cadastros/projetos/novo')}
        onEdit={(row) => navigate(`/cadastros/projetos/${row.id}`)}
        onDelete={async (id) => { await erpServices.projetos.delete(id); fetchData(); }}
        pagination={{ page: 1, limit: 100, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
      />
    </div>
  );
};

export default ProjetosCadastroList;
