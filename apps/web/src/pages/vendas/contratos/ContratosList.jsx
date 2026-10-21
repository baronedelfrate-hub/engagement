import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Receipt } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { moeda, hojeISO } from '@/lib/crmService';
import { listarContratos, valorMensal, competenciasDevidas, proximaCompetencia, rotuloCompetencia } from '@/lib/crmContratos';

const COR = { ativo: 'success', pausado: 'warning', encerrado: 'secondary' };
const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

const ContratosList = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { setContratos(await listarContratos(companyId)); }
    catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const linhas = useMemo(() => contratos.map((c) => {
    const faturadas = new Set(c.faturamentos.map((f) => String(f.competencia).slice(0, 10)));
    const devidas = competenciasDevidas(c, c.itens, faturadas, hoje);
    return { c, mensal: valorMensal(c.itens), devidas, proxima: proximaCompetencia(c, faturadas, hoje) };
  }), [contratos, hoje]);

  const ativos = linhas.filter((l) => l.c.status === 'ativo');
  const mrr = ativos.reduce((s, l) => s + l.mensal, 0);
  const mesAtual = new Date().getMonth() + 1;
  const reajustes = ativos.filter((l) => l.c.reajuste_mes === mesAtual && !(l.c.ultimo_reajuste && l.c.ultimo_reajuste.slice(0, 4) === hoje.slice(0, 4))).length;
  const aFaturar = linhas.reduce((s, l) => s + l.devidas.length, 0);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver os contratos dela.</p>;

  return (
    <>
      <Helmet><title>Contratos recorrentes</title></Helmet>
      <PageHeader
        title="Contratos recorrentes"
        description="Contratos mensais (como o BPO) que geram um pedido de venda a cada competência, no mês seguinte."
        action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate('/vendas/faturamento')}><Receipt className="w-4 h-4 mr-2" /> Faturamento do mês{aFaturar ? ` (${aFaturar})` : ''}</Button><Button onClick={() => navigate('/vendas/contratos/novo')}><Plus className="w-4 h-4 mr-2" /> Novo contrato</Button></div>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Receita recorrente mensal</p><h3 className="text-2xl font-bold text-emerald-600">{moeda(mrr)}</h3><p className="text-xs text-muted-foreground mt-1">{ativos.length} contrato(s) ativo(s)</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Competências a faturar</p><h3 className={`text-2xl font-bold ${aFaturar ? 'text-orange-600' : ''}`}>{aFaturar}</h3><p className="text-xs text-muted-foreground mt-1">meses encerrados ainda sem pedido</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Reajustes deste mês</p><h3 className={`text-2xl font-bold ${reajustes ? 'text-blue-600' : ''}`}>{reajustes}</h3><p className="text-xs text-muted-foreground mt-1">contratos com aniversário de reajuste em {String(mesAtual).padStart(2, '0')}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum contrato ainda. Eles nascem quando uma proposta com item mensal é aceita, ou pelo botão "Novo contrato".</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Contrato</th><th className="text-left p-3">Cliente</th><th className="text-right p-3">Valor mensal</th><th className="text-left p-3">Início</th><th className="text-left p-3">Faturamento</th><th className="text-left p-3">Situação</th></tr></thead>
            <tbody className="divide-y divide-border">
              {linhas.map(({ c, mensal, devidas, proxima }) => (
                <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/vendas/contratos/${c.id}`)}>
                  <td className="p-3"><div className="font-medium">{c.numero}</div><div className="text-xs text-muted-foreground truncate max-w-[260px]">{c.titulo}</div></td>
                  <td className="p-3">{c.cliente?.nome}</td>
                  <td className="p-3 text-right font-medium">{moeda(mensal)}</td>
                  <td className="p-3 text-xs">{fmt(c.data_inicio)}</td>
                  <td className="p-3 text-xs">{devidas.length ? <Badge variant="warning">{devidas.length} a faturar</Badge> : (proxima ? `próxima: ${rotuloCompetencia(proxima)}` : '—')}</td>
                  <td className="p-3"><Badge variant={COR[c.status]}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ContratosList;
