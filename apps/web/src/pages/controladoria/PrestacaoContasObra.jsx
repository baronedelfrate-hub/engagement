import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AlertTriangle, Download, FileDown, HardHat, Loader2, Printer } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { carregarRepasses, montarPrestacao, moeda, fmtData } from '@/lib/prestacaoContas';
import { gerarPrestacaoPdf } from '@/lib/prestacaoPdf';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const ROTULO_MES = (k) => { const [a, m] = k.split('-'); return `${m}/${a}`; };

// Dinheiro do cliente que passa pela conta da empresa: o que entrou, o que foi pago por conta dele e o saldo de cada obra.
const PrestacaoContasObra = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [projetos, setProjetos] = useState([]);
  const [empresa, setEmpresa] = useState('');
  const [obra, setObra] = useState('TODOS');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('pagamentos');

  useEffect(() => {
    if (authLoading || !companyId) return;
    supabase.from('projetos').select('id, nome, codigo').eq('company_id', companyId).order('nome').then(({ data }) => setProjetos(data || []));
    supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', companyId).maybeSingle().then(({ data }) => setEmpresa(data?.nome_fantasia || data?.razao_social || ''));
  }, [authLoading, companyId]);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { setDados(await carregarRepasses(companyId, { projetoId: obra, de: de || null, ate: ate || null })); }
    catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, obra, de, ate, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const r = useMemo(() => (dados ? montarPrestacao(dados.lancamentos, dados.abertos) : null), [dados]);
  const nomeObra = obra === 'TODOS' ? 'Todas as obras' : obra === 'SEM' ? 'Lançamentos sem obra' : (() => { const p = projetos.find((x) => x.id === obra); return p ? `${p.codigo ? `${p.codigo} - ` : ''}${p.nome}` : 'Obra'; })();
  const periodo = de || ate ? `${de ? fmtData(de) : 'início'} a ${ate ? fmtData(ate) : 'hoje'}` : 'todo o período';
  const semObra = dados ? dados.lancamentos.filter((l) => !l.projeto_id).length : 0;

  const exportarCSV = () => {
    const linhas = [['Tipo', 'Data', 'Fornecedor / origem', 'Descrição no extrato', 'NF / título', 'Valor', 'Conciliação']];
    r.recebimentos.forEach((l) => linhas.push(['Recebimento', fmtData(l.data_transacao), l.contraparte || '', l.descricao || '', '', Number(l.valor).toFixed(2), l.status_conciliacao || '']));
    r.pagamentos.forEach((l) => linhas.push(['Pagamento', fmtData(l.data_transacao), l.contraparte || '', l.descricao || '', l.nota_fiscal || l.titulo || '', (-l.valorAbs).toFixed(2), l.status_conciliacao || '']));
    r.abertos.filter((t) => t.tipo === 'pagar').forEach((t) => linhas.push(['A pagar (em aberto)', fmtData(t.data_vencimento), t.contraparte || '', '', t.numero_titulo || '', (-t.saldo).toFixed(2), '']));
    linhas.push([], ['Recebido', '', '', '', '', r.recebido.toFixed(2)], ['Pago', '', '', '', '', (-r.pago).toFixed(2)], ['Saldo da obra', '', '', '', '', r.saldo.toFixed(2)]);
    const csv = '﻿' + linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `prestacao_de_contas_${nomeObra.replace(/[^A-Za-z0-9]+/g, '_')}.csv`;
    a.click();
  };
  const exportarPdf = (imprimir = false) => { try { gerarPrestacaoPdf({ empresa, obra: nomeObra, periodo, resumo: r }, imprimir ? { imprimir: true } : {}); } catch (e) { toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' }); } };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver as obras dela.</p>;

  const Card1 = ({ t, v, cor = '', sub }) => <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t}</div><div className={`text-lg font-bold whitespace-nowrap ${cor}`}>{v}</div>{sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}</CardContent></Card>;

  return (
    <>
      <Helmet><title>Prestação de Contas da Obra - Engagement ERP</title></Helmet>
      <PageHeader title="Prestação de Contas da Obra" icon={HardHat}
        description="O dinheiro que o cliente depositou, o que foi pago por conta dele e o saldo de cada obra. Vem do extrato classificado, então bate com a conciliação."
        action={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-1" disabled={!r || loading} onClick={exportarCSV}><Download className="h-4 w-4" /> CSV</Button><Button size="sm" className="gap-1" disabled={!r || loading} onClick={() => exportarPdf()}><FileDown className="h-4 w-4" /> PDF para o cliente</Button><Button variant="outline" size="sm" className="gap-1" disabled={!r || loading} onClick={() => exportarPdf(true)}><Printer className="h-4 w-4" /> Imprimir</Button></div>} />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><Label className="text-xs">Obra</Label>
          <select className={`${sel} w-72 block`} value={obra} onChange={(e) => setObra(e.target.value)}>
            <option value="TODOS">Todas as obras</option><option value="SEM">Sem obra informada</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} - ` : ''}{p.nome}</option>)}
          </select></div>
        <div><Label className="text-xs">De</Label><Input type="date" className="h-9 w-40" value={de} onChange={(e) => setDe(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" className="h-9 w-40" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : dados?.semCategoria ? (
        <Card className="py-10 text-center"><CardTitle className="text-lg">Esta empresa não tem o grupo de repasse de clientes</CardTitle><CardDescription className="mt-2 max-w-xl mx-auto">Crie categorias com a linha da DRE "Recursos de clientes (repasse)" (no plano da M & A é o grupo 12) e classifique no extrato os depósitos do cliente e os pagamentos feitos por conta dele, sempre com a obra.</CardDescription></Card>
      ) : !r || dados.lancamentos.length === 0 ? (
        <Card className="py-10 text-center"><CardTitle className="text-lg">Nenhum repasse classificado {obra === 'TODOS' ? 'ainda' : 'nesta obra'}</CardTitle><CardDescription className="mt-2 max-w-xl mx-auto">Em Financeiro &gt; Classificar Extrato, classifique o depósito do cliente como "Recebimento de cliente para custear obra" e os pagamentos como "Pagamento de despesas de obra por conta do cliente", escolhendo a obra em cada um.</CardDescription></Card>
      ) : (
        <div className="space-y-4">
          {r.saldo < -0.005 && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400"><AlertTriangle className="h-5 w-5 shrink-0" /><span>O saldo está negativo em {moeda(-r.saldo)}: foi pago mais do que o cliente depositou. A diferença saiu do dinheiro próprio da empresa, e vale cobrar o cliente.</span></div>
          )}
          {semObra > 0 && obra === 'TODOS' && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"><AlertTriangle className="h-5 w-5 shrink-0" /><span>{semObra} lançamento(s) de repasse estão sem obra. Eles entram no total, mas não aparecem em nenhuma obra: classifique-os com a obra em Classificar Extrato.</span></div>
          )}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Card1 t="Recebido do cliente" v={moeda(r.recebido)} cor="text-emerald-600" sub={`${r.recebimentos.length} depósito(s)`} />
            <Card1 t="Pago por conta do cliente" v={moeda(r.pago)} cor="text-red-600" sub={`${r.pagamentos.length} pagamento(s)`} />
            <Card1 t="Saldo da obra" v={moeda(r.saldo)} cor={r.saldo < 0 ? 'text-red-600' : ''} sub="recebido − pago" />
            <Card1 t="Saldo após as contas em aberto" v={moeda(r.saldoProjetado)} cor={r.saldoProjetado < 0 ? 'text-red-600' : ''} sub={`a pagar ${moeda(r.aPagar)} · a receber ${moeda(r.aReceber)}`} />
          </div>

          {r.pendentesConciliacao > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{r.pendentesConciliacao} lançamento(s) ainda sem conciliação bancária.</p>}

          <div className="flex gap-2">
            {[['pagamentos', `Pagamentos (${r.pagamentos.length})`], ['recebimentos', `Recebimentos (${r.recebimentos.length})`], ['abertos', `Contas em aberto (${r.abertos.length})`], ['meses', 'Mês a mês']].map(([k, t]) => (
              <button key={k} type="button" onClick={() => setAba(k)} className={`px-3 py-1.5 rounded-md border text-sm ${aba === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>{t}</button>
            ))}
          </div>

          <div className="rounded-lg border border-border overflow-x-auto bg-card">
            {aba === 'pagamentos' && (
              <table className="w-full text-sm min-w-[760px]"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Data</th><th className="text-left p-2">Fornecedor / descrição</th><th className="text-left p-2">NF / título</th><th className="text-left p-2">Conciliação</th><th className="text-right p-2">Valor</th></tr></thead>
                <tbody className="divide-y divide-border">{r.pagamentos.map((l) => (
                  <tr key={l.id}><td className="p-2 whitespace-nowrap">{fmtData(l.data_transacao)}</td><td className="p-2">{l.contraparte || l.descricao}{l.contraparte && l.descricao && <div className="text-[11px] text-muted-foreground truncate max-w-md">{l.descricao}</div>}</td>
                    <td className="p-2">{l.nota_fiscal || l.titulo || '—'}{l.anexos > 0 && <span className="ml-1 text-[11px] text-muted-foreground">({l.anexos} anexo{l.anexos > 1 ? 's' : ''})</span>}</td>
                    <td className="p-2 text-xs">{l.status_conciliacao || '—'}</td><td className="p-2 text-right font-medium whitespace-nowrap">{moeda(l.valorAbs)}</td></tr>))}</tbody></table>
            )}
            {aba === 'recebimentos' && (
              <table className="w-full text-sm min-w-[600px]"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Data</th><th className="text-left p-2">Origem (quem depositou)</th><th className="text-left p-2">Conciliação</th><th className="text-right p-2">Valor</th></tr></thead>
                <tbody className="divide-y divide-border">{r.recebimentos.map((l) => (
                  <tr key={l.id}><td className="p-2 whitespace-nowrap">{fmtData(l.data_transacao)}</td><td className="p-2">{l.contraparte || l.descricao}{l.contraparte && l.descricao && <div className="text-[11px] text-muted-foreground truncate max-w-md">{l.descricao}</div>}</td><td className="p-2 text-xs">{l.status_conciliacao || '—'}</td><td className="p-2 text-right font-medium text-emerald-600 whitespace-nowrap">{moeda(l.valor)}</td></tr>))}</tbody></table>
            )}
            {aba === 'abertos' && (r.abertos.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conta da obra em aberto.</p> : (
              <table className="w-full text-sm min-w-[600px]"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Fornecedor / cliente</th><th className="text-left p-2">NF / título</th><th className="text-left p-2">Tipo</th><th className="text-right p-2">Valor</th></tr></thead>
                <tbody className="divide-y divide-border">{r.abertos.map((t) => (
                  <tr key={t.id}><td className="p-2 whitespace-nowrap">{fmtData(t.data_vencimento)}</td><td className="p-2">{t.contraparte || '—'}</td><td className="p-2">{t.numero_titulo}</td><td className="p-2"><Badge variant={t.tipo === 'pagar' ? 'destructive' : 'success'}>{t.tipo === 'pagar' ? 'pagar' : 'receber'}</Badge>{t.provisao && <Badge variant="outline" className="ml-1">provisão</Badge>}</td><td className="p-2 text-right font-medium whitespace-nowrap">{moeda(t.saldo)}</td></tr>))}</tbody></table>
            ))}
            {aba === 'meses' && (
              <table className="w-full text-sm min-w-[480px]"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Mês</th><th className="text-right p-2">Recebido</th><th className="text-right p-2">Pago</th><th className="text-right p-2">Resultado do mês</th></tr></thead>
                <tbody className="divide-y divide-border">{r.porMes.map((m) => (<tr key={m.mes}><td className="p-2">{ROTULO_MES(m.mes)}</td><td className="p-2 text-right text-emerald-600">{moeda(m.recebido)}</td><td className="p-2 text-right text-red-600">{moeda(m.pago)}</td><td className={`p-2 text-right font-medium ${m.saldo < 0 ? 'text-red-600' : ''}`}>{moeda(m.saldo)}</td></tr>))}</tbody></table>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Este valor não é receita nem despesa da empresa: é dinheiro de terceiros em trânsito, fora da DRE. Os pagamentos mostram o fornecedor e o nº da NF do título pago; as NFs anexadas ao título ficam no Contas a pagar.</p>
        </div>
      )}
    </>
  );
};

export default PrestacaoContasObra;
