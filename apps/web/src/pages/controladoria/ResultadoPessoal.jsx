import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Download, Loader2, AlertCircle, Building2, ChevronRight, ChevronDown, User } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { supabase } from '@/lib/customSupabaseClient';
import { montarResultadoPessoal } from '@/lib/resultadoPessoal';
import { MESES } from '@/lib/dreGerencial';

const fmt = (v) => (v === 0 ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cor = (v) => (v < 0 ? 'text-red-600 dark:text-red-400' : '');

function ResultadoPessoal() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [abertas, setAbertas] = useState(new Set());
  const [tipo, setTipo] = useState(null);
  const alternar = (chave) => setAbertas((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });

  useEffect(() => {
    if (!empresaId) { setTipo(null); return; }
    supabase.from('empresas').select('tipo_pessoa').eq('id', empresaId).maybeSingle().then(({ data }) => setTipo(data?.tipo_pessoa || 'PJ'));
  }, [empresaId]);

  const r = useMemo(() => (ano ? montarResultadoPessoal(movs, { ano, categorias, subcategorias }) : null), [movs, ano, categorias, subcategorias]);

  const exportCSV = () => {
    if (!r) return;
    const linhas = [['Conta', ...MESES.map((m) => `${m}/${String(ano).slice(2)}`), 'Total']];
    const add = (rotulo, o, prefixo = '') => linhas.push([prefixo + rotulo, ...o.valores.map((v) => v.toFixed(2)), o.total.toFixed(2)]);
    const bloco = (lista) => lista.forEach((l) => { add(l.rotulo, l); l.detalhes.forEach((d) => add(d.rotulo, d, '   ')); });
    bloco(r.entradas); add('TOTAL DE ENTRADAS', r.totalEntradas);
    bloco(r.gastos); add('TOTAL DE GASTOS', r.totalGastos);
    add('SALDO DO MÊS', r.saldo);
    linhas.push(['Movimentações que não entram no saldo']);
    bloco(r.fora); add(r.pendente.rotulo, r.pendente);
    add('Movimentação líquida do caixa (conferência)', r.caixa);
    const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `resultado_pessoal_${ano}.csv`;
    link.click();
  };

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const semMovimento = movs.length === 0;

  const Linha = ({ l, destaque }) => {
    const expansivel = l.detalhes.length > 0;
    const aberta = abertas.has(l.chave);
    return (
      <>
        <tr className={`border-b border-border ${destaque || ''} ${expansivel ? 'cursor-pointer hover:bg-muted/50' : ''}`} onClick={() => expansivel && alternar(l.chave)}>
          <td className="px-3 py-2 text-left sticky left-0 bg-background">
            <span className="inline-flex items-center gap-1">{expansivel ? (aberta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-3.5" />}{l.rotulo}</span>
          </td>
          {l.valores.map((v, i) => <td key={i} className={`px-3 py-2 ${cor(v)}`}>{fmt(v)}</td>)}
          <td className={`px-3 py-2 font-bold ${cor(l.total)}`}>{fmt(l.total)}</td>
        </tr>
        {aberta && l.detalhes.map((d) => (
          <tr key={d.id} className="border-b border-border/50 text-xs text-muted-foreground">
            <td className="px-3 py-1.5 text-left pl-10 sticky left-0 bg-background">{d.rotulo}</td>
            {d.valores.map((v, i) => <td key={i} className={`px-3 py-1.5 ${cor(v)}`}>{fmt(v)}</td>)}
            <td className={`px-3 py-1.5 ${cor(d.total)}`}>{fmt(d.total)}</td>
          </tr>
        ))}
      </>
    );
  };
  const Total = ({ rotulo, o, fundo = 'bg-muted font-bold' }) => (
    <tr className={`border-b border-border ${fundo}`}>
      <td className="px-3 py-2 text-left sticky left-0 bg-muted">{rotulo}</td>
      {o.valores.map((v, i) => <td key={i} className={`px-3 py-2 ${cor(v)}`}>{fmt(v)}</td>)}
      <td className={`px-3 py-2 ${cor(o.total)}`}>{fmt(o.total)}</td>
    </tr>
  );
  const Cabecalho = ({ texto }) => <tr><td colSpan={14} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">{texto}</td></tr>;

  return (
    <>
      <Helmet><title>Resultado Pessoal - Engagement ERP</title></Helmet>
      <PageHeader
        title="Resultado Pessoal"
        description="Orçamento e resultado de uma pessoa física: entradas, gastos por categoria e saldo do mês, no regime de caixa, a partir do extrato classificado."
        icon={User}
        action={<Button onClick={exportCSV} disabled={!r || loading || semMovimento} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>}
      />
      <FiltrosGerenciais dados={dados} />

      {!empresaId ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-xl text-muted-foreground">Nenhum cadastro selecionado</CardTitle>
          <CardDescription className="max-w-md mt-2">{isSuperAdmin ? 'Selecione a pessoa no filtro acima.' : 'Seu usuário não está ligado a um cadastro.'}</CardDescription>
        </Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading || !r ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {tipo === 'PJ' && <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">Este cadastro é de pessoa jurídica. Para empresas, use a tela DRE; aqui os valores só aparecem se as categorias forem pessoais.</p>}
          {semMovimento ? (
            <Card className="py-12 text-center">
              <CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle>
              <CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato e classifique cada lançamento.</CardDescription>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Orçamento e resultado — {ano}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right min-w-[1100px]">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="px-3 py-2 text-left sticky left-0 bg-muted min-w-[300px]">Conta</th>
                        {MESES.map((m) => <th key={m} className="px-3 py-2">{m}/{String(ano).slice(2)}</th>)}
                        <th className="px-3 py-2 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Cabecalho texto="Entradas" />
                      {r.entradas.map((l) => <Linha key={l.chave} l={l} />)}
                      <Total rotulo="TOTAL DE ENTRADAS" o={r.totalEntradas} />
                      <Cabecalho texto="Gastos" />
                      {r.gastos.map((l) => <Linha key={l.chave} l={l} />)}
                      <Total rotulo="TOTAL DE GASTOS" o={r.totalGastos} />
                      <Total rotulo="SALDO DO MÊS (entradas − gastos)" o={r.saldo} fundo="bg-blue-500/10 font-bold" />
                      <Cabecalho texto="Movimentações que não entram no saldo" />
                      {r.fora.map((l) => <Linha key={l.chave} l={l} />)}
                      <Linha l={r.pendente} destaque="bg-amber-500/10" />
                      <Total rotulo="Movimentação líquida do caixa (conferência)" o={r.caixa} />
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Clique numa linha para ver as contas. Fatura de cartão: os gastos entram item a item nas categorias; o pagamento da fatura no banco vai em "Pagamento de fatura de cartão" para não contar duas vezes. A conferência é o que aconteceu no caixa: saldo + o que ficou fora do saldo + o que ainda não foi classificado.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}

export default ResultadoPessoal;
