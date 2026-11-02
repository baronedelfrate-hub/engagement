import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Download, Loader2, AlertCircle, Building2, ChevronRight, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { montarDRE } from '@/lib/dreGerencial';

const fmt = (v) => (v === 0 ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cor = (v) => (v < 0 ? 'text-red-600 dark:text-red-400' : '');

// DRE gerencial com uma coluna por centro de custo (operação): BPO E5, Consultoria F5, Academy, System, Overhead...
function ResultadoPorCentroCusto() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, centros, centroCustoId, loading, error } = dados;
  const [abertas, setAbertas] = useState(new Set());
  const alternar = (chave) => setAbertas((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });

  const matriz = useMemo(() => {
    if (!ano || movs.length === 0) return null;
    const grupos = new Map();
    for (const m of movs) {
      const k = m.centro_custo_id || 'SEM';
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(m);
    }
    const nomes = new Map(centros.map((c) => [c.id, `${c.codigo ? c.codigo + ' - ' : ''}${c.nome}`]));
    const cols = centros
      .filter((c) => grupos.has(c.id))
      .map((c) => ({ chave: c.id, nome: nomes.get(c.id), dre: montarDRE(grupos.get(c.id), { ano, categorias, subcategorias }) }));
    // centros que não estão mais ativos mas ainda têm lançamentos
    for (const [k, l] of grupos.entries()) {
      if (k !== 'SEM' && !centros.some((c) => c.id === k)) cols.push({ chave: k, nome: 'Centro de custo removido', dre: montarDRE(l, { ano, categorias, subcategorias }) });
    }
    if (grupos.has('SEM')) cols.push({ chave: 'SEM', nome: 'Sem centro de custo', dre: montarDRE(grupos.get('SEM'), { ano, categorias, subcategorias }) });
    const totalDre = montarDRE(movs, { ano, categorias, subcategorias });
    cols.push({ chave: 'TOTAL', nome: 'TOTAL', dre: totalDre });
    return { cols, linhas: totalDre.linhas };
  }, [movs, ano, categorias, subcategorias, centros]);

  const valorLinha = (col, chave) => col.dre.porChave[chave]?.total || 0;
  const valorDetalhe = (col, chave, id) => col.dre.linhas.find((l) => l.chave === chave)?.detalhes.find((d) => d.id === id)?.total || 0;

  const exportCSV = () => {
    if (!matriz) return;
    const linhasCsv = [['Conta', ...matriz.cols.map((c) => c.nome)]];
    for (const l of matriz.linhas) {
      linhasCsv.push([l.rotulo, ...matriz.cols.map((c) => valorLinha(c, l.chave).toFixed(2))]);
      for (const d of l.detalhes) linhasCsv.push([`   ${d.rotulo}`, ...matriz.cols.map((c) => valorDetalhe(c, l.chave, d.id).toFixed(2))]);
    }
    const csv = '﻿' + linhasCsv.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `dre_por_centro_custo_${ano}.csv`;
    link.click();
  };

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const semMovimento = movs.length === 0;
  const semCentros = empresaId && !loading && centros.length === 0;

  return (
    <>
      <Helmet><title>Resultado por Centro de Custo - Engagement ERP</title></Helmet>
      <PageHeader
        title="Resultado por Centro de Custo"
        description="DRE gerencial com uma coluna por centro de custo (operação), no regime de caixa, a partir do extrato bancário classificado."
        action={<Button onClick={exportCSV} disabled={loading || semMovimento || !matriz} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>}
      />

      <FiltrosGerenciais dados={dados} />

      {!empresaId ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle>
          <CardDescription className="max-w-md mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription>
        </Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : semCentros ? (
        <Card className="py-12 text-center">
          <CardTitle className="text-lg">Esta empresa não tem centros de custo</CardTitle>
          <CardDescription className="mt-2">Cadastre em Cadastros &gt; Centro de Custos e escolha o centro ao classificar cada lançamento.</CardDescription>
        </Card>
      ) : semMovimento || !matriz ? (
        <Card className="py-12 text-center">
          <CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle>
          <CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato e classifique, escolhendo o centro de custo de cada lançamento.</CardDescription>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>DRE por centro de custo — {ano}</CardTitle></CardHeader>
          <CardContent>
            {centroCustoId !== 'TODOS' && <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">O filtro de centro de custo está ativo: só aparece a coluna escolhida. Selecione "Todos os centros de custo" para comparar as operações.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right" style={{ minWidth: 320 + matriz.cols.length * 160 }}>
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-3 py-2 text-left sticky left-0 bg-muted min-w-[280px]">Conta</th>
                    {matriz.cols.map((c) => <th key={c.chave} className={`px-3 py-2 ${c.chave === 'TOTAL' ? 'font-bold' : ''}`}>{c.nome}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matriz.linhas.map((l) => {
                    const expansivel = l.detalhes.length > 0;
                    const aberta = abertas.has(l.chave);
                    const subtotal = l.tipo === 'subtotal';
                    return (
                      <React.Fragment key={l.chave}>
                        {l.chave === 'socios' && <tr><td colSpan={matriz.cols.length + 1} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">Fora da DRE (entram no caixa)</td></tr>}
                        {l.chave === 'repasse_clientes' && <tr><td colSpan={matriz.cols.length + 1} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">Fora da DRE e do caixa</td></tr>}
                        <tr className={`border-b border-border ${subtotal ? 'bg-muted font-bold' : ''} ${expansivel ? 'cursor-pointer hover:bg-muted/50' : ''}`} onClick={() => expansivel && alternar(l.chave)}>
                          <td className={`px-3 py-2 text-left sticky left-0 ${subtotal ? 'bg-muted' : 'bg-background'}`}>
                            <span className="inline-flex items-center gap-1">
                              {expansivel ? (aberta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-3.5" />}
                              {l.rotulo}
                            </span>
                          </td>
                          {matriz.cols.map((c) => { const v = valorLinha(c, l.chave); return <td key={c.chave} className={`px-3 py-2 ${cor(v)} ${c.chave === 'TOTAL' ? 'font-bold' : ''}`}>{fmt(v)}</td>; })}
                        </tr>
                        {aberta && l.detalhes.map((d) => (
                          <tr key={d.id} className="border-b border-border/50 text-xs text-muted-foreground">
                            <td className="px-3 py-1.5 text-left pl-10 sticky left-0 bg-background">{d.rotulo}</td>
                            {matriz.cols.map((c) => { const v = valorDetalhe(c, l.chave, d.id); return <td key={c.chave} className={`px-3 py-1.5 ${cor(v)}`}>{fmt(v)}</td>; })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Lançamentos sem centro de custo aparecem em "Sem centro de custo". Despesas do Overhead (administrativo, financeiro e gestão) não são rateadas entre as operações: aparecem na coluna do próprio centro. Valores sem categoria ficam em "Ainda não classificado" e não entram no lucro —{' '}
              <Link to="/financeiro/classificar-extrato" className="text-blue-600 underline">classificar agora</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default ResultadoPorCentroCusto;
