import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Download, Loader2, AlertCircle, Building2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { montarDRE } from '@/lib/dreGerencial';

const fmt = (v) => (v === 0 ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cor = (v) => (v < 0 ? 'text-red-600 dark:text-red-400' : '');

// Colunas = linhas da DRE; uma linha por obra/projeto, mais "Sem projeto" e o total.
const COLUNAS = [
  ['receita_bruta', 'Receita bruta'],
  ['deducoes', 'Deduções'],
  ['receita_liquida', 'Receita líquida'],
  ['custo_mao_obra', 'Mão de obra'],
  ['custo_ferramentas', 'Ferramentas'],
  ['custo_midia', 'Mídia'],
  ['lucro_bruto', 'Lucro bruto'],
  ['desp_administrativas', 'Desp. administrativas'],
  ['desp_comerciais', 'Desp. comerciais'],
  ['desp_estrutura', 'Desp. estrutura'],
  ['desp_gerais', 'Desp. gerais'],
  ['resultado_operacional', 'Result. operacional'],
  ['receita_financeira', 'Rec. financeira'],
  ['desp_financeira', 'Desp. financeira'],
  ['lucro_liquido', 'Lucro líquido']
];

function ResultadoPorObra() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, projetos, projetoId, loading, error } = dados;

  const linhas = useMemo(() => {
    if (!ano) return [];
    const grupos = new Map();
    for (const m of movs) {
      const k = m.projeto_id || 'SEM';
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(m);
    }
    const nomes = new Map(projetos.map((p) => [p.id, `${p.codigo ? p.codigo + ' - ' : ''}${p.nome}`]));
    const montar = (nome, lista, chave) => {
      const dre = montarDRE(lista, { ano, categorias, subcategorias });
      const t = (k) => dre.porChave[k].total;
      const rb = t('receita_bruta');
      return { chave, nome, t, naoClass: t('nao_classificado'), margem: rb > 0 ? (t('lucro_liquido') / rb) * 100 : null };
    };
    const lista = [...grupos.entries()]
      .filter(([k]) => k !== 'SEM')
      .map(([k, l]) => montar(nomes.get(k) || 'Projeto removido', l, k))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    if (grupos.has('SEM')) lista.push(montar('Sem projeto (não se aplica)', grupos.get('SEM'), 'SEM'));
    return lista;
  }, [movs, ano, categorias, subcategorias, projetos]);

  const total = useMemo(() => (ano && movs.length ? montar0(movs, ano, categorias, subcategorias) : null), [movs, ano, categorias, subcategorias]);

  const exportCSV = () => {
    const cab = ['Obra / projeto', ...COLUNAS.map(([, r]) => r), 'Margem líquida %', 'Não classificado'];
    const corpo = [...linhas, ...(total ? [{ nome: 'TOTAL', t: total.t, margem: total.margem, naoClass: total.naoClass }] : [])]
      .map((l) => [l.nome, ...COLUNAS.map(([k]) => l.t(k).toFixed(2)), l.margem == null ? '' : l.margem.toFixed(1), l.naoClass.toFixed(2)]);
    const csv = '﻿' + [cab, ...corpo].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `resultado_por_obra_${ano}.csv`;
    link.click();
  };

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const semMovimento = movs.length === 0;

  return (
    <>
      <Helmet><title>Resultado por Obra - ERP Platform</title></Helmet>
      <PageHeader
        title="Resultado por Obra"
        description="DRE resumida de cada obra/projeto no regime de caixa, a partir do extrato bancário classificado."
        action={<Button onClick={exportCSV} disabled={loading || semMovimento} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>}
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
      ) : semMovimento ? (
        <Card className="py-12 text-center">
          <CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle>
          <CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato e classifique, escolhendo o projeto de cada lançamento.</CardDescription>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Resultado por obra — {ano}</CardTitle></CardHeader>
          <CardContent>
            {projetoId !== 'TODOS' && <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">O filtro de projeto está ativo: só aparece a linha escolhida. Selecione "Todos os projetos" para comparar as obras.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right min-w-[1400px]">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-3 py-2 text-left sticky left-0 bg-muted min-w-[240px]">Obra / projeto</th>
                    {COLUNAS.map(([k, r]) => <th key={k} className={`px-3 py-2 ${['receita_liquida', 'lucro_bruto', 'resultado_operacional', 'lucro_liquido'].includes(k) ? 'font-bold' : ''}`}>{r}</th>)}
                    <th className="px-3 py-2">Margem líq.</th>
                    <th className="px-3 py-2">Não classif.</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.chave} className="border-b border-border hover:bg-muted/40">
                      <td className="px-3 py-2 text-left sticky left-0 bg-background font-medium">{l.nome}</td>
                      {COLUNAS.map(([k]) => <td key={k} className={`px-3 py-2 ${cor(l.t(k))} ${k === 'lucro_liquido' ? 'font-bold' : ''}`}>{fmt(l.t(k))}</td>)}
                      <td className={`px-3 py-2 ${l.margem != null && l.margem < 0 ? 'text-red-600' : ''}`}>{l.margem == null ? '—' : `${l.margem.toFixed(1)}%`}</td>
                      <td className="px-3 py-2">{fmt(l.naoClass)}</td>
                    </tr>
                  ))}
                  {total && (
                    <tr className="border-t-2 border-border bg-muted font-bold">
                      <td className="px-3 py-2 text-left sticky left-0 bg-muted">TOTAL</td>
                      {COLUNAS.map(([k]) => <td key={k} className={`px-3 py-2 ${cor(total.t(k))}`}>{fmt(total.t(k))}</td>)}
                      <td className="px-3 py-2">{total.margem == null ? '—' : `${total.margem.toFixed(1)}%`}</td>
                      <td className="px-3 py-2">{fmt(total.naoClass)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Lançamentos sem projeto aparecem em "Sem projeto". Valores sem categoria ficam em "Não classif." e não entram no lucro —{' '}
              <Link to="/financeiro/classificar-extrato" className="text-blue-600 underline">classificar agora</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function montar0(movs, ano, categorias, subcategorias) {
  const dre = montarDRE(movs, { ano, categorias, subcategorias });
  const t = (k) => dre.porChave[k].total;
  const rb = t('receita_bruta');
  return { t, naoClass: t('nao_classificado'), margem: rb > 0 ? (t('lucro_liquido') / rb) * 100 : null };
}

export default ResultadoPorObra;
