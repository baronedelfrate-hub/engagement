import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Download, Loader2, AlertCircle, Building2, ChevronRight, ChevronDown, User, FileDown, Printer, Mail, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import EnviarEmailDialog from '@/components/EnviarEmailDialog';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { gerarResultadoPessoalPdf, gastosDoMes } from '@/lib/resultadoPessoalPdf';
import { saldosBancariosNoMes } from '@/lib/saldoBancoMes';
import { textoLimite } from '@/lib/extratoConciliado';
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
  const { toast } = useToast();
  const [mes, setMes] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [bancos, setBancos] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [emailAberto, setEmailAberto] = useState(false);
  const [zapAberto, setZapAberto] = useState(false);
  const alternar = (chave) => setAbertas((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });

  useEffect(() => {
    if (!empresaId) { setTipo(null); setEmpresa(null); return; }
    supabase.from('empresas').select('razao_social, nome_fantasia, cnpj, email, telefone, tipo_pessoa').eq('id', empresaId).maybeSingle().then(({ data }) => { setEmpresa(data); setTipo(data?.tipo_pessoa || 'PJ'); });
  }, [empresaId]);

  // mês inicial: o do último lançamento do ano
  useEffect(() => {
    if (!movs.length) return;
    const ultimo = movs.reduce((a, b) => (a > b.data_transacao ? a : b.data_transacao), '');
    setMes((atual) => (atual !== null && movs.some((m) => Number(m.data_transacao.slice(5, 7)) - 1 === atual) ? atual : Number(ultimo.slice(5, 7)) - 1));
  }, [movs]);

  useEffect(() => {
    if (!empresaId || !ano || mes === null) { setBancos([]); return undefined; }
    let ativo = true;
    saldosBancariosNoMes(empresaId, ano, mes).then((l) => { if (ativo) setBancos(l); }).catch(() => { if (ativo) setBancos([]); });
    return () => { ativo = false; };
  }, [empresaId, ano, mes]);

  const r = useMemo(() => (ano ? montarResultadoPessoal(movs, { ano, categorias, subcategorias }) : null), [movs, ano, categorias, subcategorias]);

  const gerar = async (imprimir = false) => {
    setGerando(true);
    try {
      const nome = await gerarResultadoPessoalPdf({ empresa, ano, mes, r, bancos }, imprimir ? { imprimir: true } : {});
      toast({ title: imprimir ? 'Impressão preparada' : 'Relatório gerado', description: imprimir ? 'Escolha a impressora na janela que abriu.' : `Arquivo ${nome} baixado.` });
    } catch (e) {
      toast({ title: 'Erro ao gerar o PDF', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally { setGerando(false); }
  };

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
  const pronto = !!r && mes !== null && !semMovimento && !loading;
  const fmtBR = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || '';
  const brl = (v) => `R$ ${fmtBR(v)}`;
  const topGastos = pronto ? gastosDoMes(r, mes) : [];
  const mensagemResumo = pronto ? [
    `Olá! Segue o resultado pessoal de *${MESES[mes]}/${ano}*${nomeEmpresa ? ` — ${nomeEmpresa}` : ''}.`, '',
    `Entradas: *${brl(r.totalEntradas.valores[mes])}*`,
    `Gastos: *${brl(-r.totalGastos.valores[mes])}*`,
    `Saldo do mês: *${brl(r.saldo.valores[mes])}*`,
    ...bancos.map((b) => `${b.nome}: *${brl(b.saldo)}*${textoLimite(b.saldo, b.limite) ? ` (${textoLimite(b.saldo, b.limite)})` : ''}`),
    ...(topGastos.length ? ['', 'Onde mais gastou:', ...topGastos.slice(0, 3).map((c) => `• ${c.nome}: ${brl(c.total)}`)] : []), '',
    'O PDF segue em anexo, com os gráficos e o detalhe por categoria.'
  ].join('\n') : '';
  const serieMensal = pronto ? MESES.map((m, i) => ({ mes: m, Entradas: r.totalEntradas.valores[i], Gastos: -r.totalGastos.valores[i], Saldo: r.saldo.valores[i] })).slice(0, mes + 1) : [];
  const serieAcum = serieMensal.reduce((a, d, i) => [...a, { mes: d.mes, 'Saldo acumulado': Math.round(((a[i - 1]?.['Saldo acumulado'] || 0) + d.Saldo) * 100) / 100 }], []);
  const dadosCat = topGastos.slice(0, 8).map((c) => ({ nome: c.nome.length > 28 ? `${c.nome.slice(0, 27)}…` : c.nome, Gasto: c.total }));

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
      <FiltrosGerenciais dados={dados}>
        <Select value={mes === null ? '' : String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="w-32 bg-background"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => gerar()} disabled={!pronto || gerando} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">{gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Gerar PDF</Button>
        <Button onClick={() => gerar(true)} disabled={!pronto || gerando} variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Imprimir</Button>
        <Button onClick={() => setEmailAberto(true)} disabled={!pronto} variant="outline" className="gap-2"><Mail className="h-4 w-4" /> Enviar por e-mail</Button>
        <Button onClick={() => setZapAberto(true)} disabled={!pronto} variant="outline" className="gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp</Button>
      </FiltrosGerenciais>

      {pronto && (
        <>
          <EnviarWhatsAppDialog
            open={zapAberto} onOpenChange={setZapAberto}
            titulo="Enviar o resultado pessoal por WhatsApp" descricao={`${nomeEmpresa} · ${MESES[mes]}/${ano}`}
            tipo="resultado_pessoal" refTipo="resultado_pessoal" refId={empresaId}
            paraInicial={empresa?.telefone || ''}
            mensagemInicial={mensagemResumo}
            anexos={[{ rotulo: 'Resultado pessoal em PDF', gerar: () => gerarResultadoPessoalPdf({ empresa, ano, mes, r, bancos }, { base64: true }) }]}
          />
          <EnviarEmailDialog
            open={emailAberto} onOpenChange={setEmailAberto}
            titulo="Enviar o resultado pessoal" descricao={`${nomeEmpresa} · ${MESES[mes]}/${ano}`}
            tipo="resultado_pessoal" refTipo="resultado_pessoal" refId={empresaId}
            paraInicial={empresa?.email || ''}
            assuntoInicial={`Resultado pessoal de ${MESES[mes]}/${ano} — ${nomeEmpresa}`}
            mensagemInicial={mensagemResumo.replace(/\*/g, '')}
            destaques={[
              { rotulo: 'Entradas', valor: `R$ ${fmtBR(r.totalEntradas.valores[mes])}` },
              { rotulo: 'Gastos', valor: `R$ ${fmtBR(-r.totalGastos.valores[mes])}` },
              { rotulo: 'Saldo do mês', valor: `R$ ${fmtBR(r.saldo.valores[mes])}` }
            ]}
            anexos={[{ rotulo: 'Resultado pessoal em PDF', gerar: () => gerarResultadoPessoalPdf({ empresa, ano, mes, r, bancos }, { base64: true }) }]}
          />
        </>
      )}

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
            <>
            {mes !== null && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Entradas — {MESES[mes]}</div><div className="text-lg font-bold text-emerald-600">{brl(r.totalEntradas.valores[mes])}</div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gastos — {MESES[mes]}</div><div className="text-lg font-bold text-red-600">{brl(-r.totalGastos.valores[mes])}</div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Saldo do mês</div><div className={`text-lg font-bold ${cor(r.saldo.valores[mes])}`}>{brl(r.saldo.valores[mes])}</div></CardContent></Card>
                  {bancos.slice(0, 1).map((b) => (
                    <Card key={b.id}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{b.saldo < 0 && b.limite > 0 ? 'Limite em uso' : 'Saldo no banco'} — fim de {MESES[mes]}</div><div className={`text-lg font-bold ${cor(b.saldo)}`}>{brl(b.saldo)}</div><div className="text-[11px] text-muted-foreground">{textoLimite(b.saldo, b.limite)}</div></CardContent></Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Entradas x gastos por mês</CardTitle></CardHeader>
                    <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serieMensal}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip formatter={(v) => brl(v)} /><Legend />
                        <Bar dataKey="Entradas" fill="#22c55e" /><Bar dataKey="Gastos" fill="#ef4444" /><Bar dataKey="Saldo" fill="#3b82f6" /></BarChart>
                    </ResponsiveContainer></div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Saldo acumulado no ano</CardTitle></CardHeader>
                    <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
                      <LineChart data={serieAcum}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip formatter={(v) => brl(v)} />
                        <Line type="monotone" dataKey="Saldo acumulado" stroke="#6366f1" strokeWidth={2} dot /></LineChart>
                    </ResponsiveContainer></div></CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Para onde foi o dinheiro — {MESES[mes]}/{ano}</CardTitle></CardHeader>
                    <CardContent>{dadosCat.length ? <div style={{ height: Math.max(180, dadosCat.length * 34) }}><ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosCat} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><YAxis type="category" dataKey="nome" width={190} fontSize={11} /><Tooltip formatter={(v) => brl(v)} />
                        <Bar dataKey="Gasto" fill="#f97316" /></BarChart>
                    </ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Nenhum gasto classificado neste mês.</p>}</CardContent>
                  </Card>
                </div>
              </>
            )}
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
            </>
          )}
        </>
      )}
    </>
  );
}

export default ResultadoPessoal;
