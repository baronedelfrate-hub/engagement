import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { MESES } from '@/lib/dreGerencial';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

// quantos dias o extrato está atrasado em relação a hoje
const diasDeAtraso = (iso) => (iso ? Math.floor((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86400000) : null);

const situacaoExtrato = (iso) => {
  const d = diasDeAtraso(iso);
  if (d === null) return { texto: 'Sem extrato', classe: 'border-border text-muted-foreground' };
  if (d <= 7) return { texto: 'Em dia', classe: 'border-green-500/40 text-green-600' };
  if (d <= 35) return { texto: `${d} dias`, classe: 'border-amber-500/40 text-amber-600' };
  return { texto: `${d} dias`, classe: 'border-red-500/40 text-red-600' };
};

const PainelCarteira = () => {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase.rpc('painel_carteira');
    if (e) setError(e.message || 'Não foi possível carregar o painel.');
    else setLinhas(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const resumo = useMemo(() => ({
    clientes: linhas.length,
    comPendencia: linhas.filter((l) => l.a_classificar_qtd > 0).length,
    extratoAtrasado: linhas.filter((l) => { const d = diasDeAtraso(l.extrato_ate); return d === null || d > 35; }).length,
    comVencidos: linhas.filter((l) => l.titulos_vencidos_qtd > 0).length
  }), [linhas]);

  return (
    <>
      <Helmet><title>Carteira de Clientes - ERP Platform</title></Helmet>
      <PageHeader
        title="Carteira de Clientes"
        description="Visão de todos os clientes do BPO: extrato, pendências de classificação, títulos vencidos e resultado do último mês."
        action={<Button variant="outline" onClick={carregar} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>}
      />

      {error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{resumo.clientes}</div></CardContent></Card>
            <Card className={resumo.comPendencia ? 'border-amber-500/50' : ''}><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-amber-600">Com lançamentos a classificar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{resumo.comPendencia}</div></CardContent></Card>
            <Card className={resumo.extratoAtrasado ? 'border-red-500/50' : ''}><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-red-600">Extrato atrasado (&gt; 35 dias)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{resumo.extratoAtrasado}</div></CardContent></Card>
            <Card className={resumo.comVencidos ? 'border-red-500/50' : ''}><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-red-600">Com títulos vencidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{resumo.comVencidos}</div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Extrato até</th>
                      <th className="p-3 text-right">A classificar</th>
                      <th className="p-3 text-right">Não conciliados</th>
                      <th className="p-3 text-right">Títulos em aberto</th>
                      <th className="p-3 text-right">Vencidos</th>
                      <th className="p-3 text-right">Receita do mês</th>
                      <th className="p-3 text-right">Resultado do mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {linhas.length === 0 ? (
                      <tr><td colSpan="8" className="p-10 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
                    ) : linhas.map((l) => {
                      const sit = situacaoExtrato(l.extrato_ate);
                      const mesRef = l.mes_ref ? `${MESES[Number(l.mes_ref.slice(5, 7)) - 1]}/${l.mes_ref.slice(2, 4)}` : null;
                      return (
                        <tr key={l.empresa_id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium">{l.nome_fantasia || l.razao_social}</div>
                            {l.nome_fantasia && <div className="text-xs text-muted-foreground">{l.razao_social}</div>}
                          </td>
                          <td className="p-3">
                            <div>{dataBR(l.extrato_ate)}</div>
                            <Badge variant="outline" className={sit.classe}>{sit.texto}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            {l.a_classificar_qtd > 0 ? (
                              <Link to="/financeiro/classificar-extrato" className="text-amber-600 hover:underline">{l.a_classificar_qtd} · {brl(l.a_classificar_valor)}</Link>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3 text-right">{l.nao_conciliados > 0 ? l.nao_conciliados : <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 text-right">{l.titulos_abertos_qtd > 0 ? `${l.titulos_abertos_qtd} · ${brl(l.titulos_abertos_valor)}` : <span className="text-muted-foreground">—</span>}</td>
                          <td className={`p-3 text-right ${l.titulos_vencidos_qtd > 0 ? 'text-red-600 font-medium' : ''}`}>{l.titulos_vencidos_qtd > 0 ? `${l.titulos_vencidos_qtd} · ${brl(l.titulos_vencidos_valor)}` : <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 text-right">{mesRef ? <><div>{brl(l.receita_mes)}</div><div className="text-xs text-muted-foreground">{mesRef}</div></> : '—'}</td>
                          <td className={`p-3 text-right font-medium ${Number(l.resultado_mes) < 0 ? 'text-red-600' : ''}`}>{mesRef ? brl(l.resultado_mes) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            Resultado do mês = lucro líquido do DRE gerencial no mês do último lançamento do extrato. Para ver o detalhe de um cliente, use a DRE, o Ponto de Equilíbrio ou o Dashboard Gerencial e escolha a empresa no filtro.
          </p>
        </>
      )}
    </>
  );
};

export default PainelCarteira;
