import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Download, FileText, Loader2, AlertCircle, Building2, ChevronRight, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { montarDRE, MESES } from '@/lib/dreGerencial';
import { gerarDreGerencialPdf } from '@/lib/dreGerencialPdf';
import { buscarNomeEmpresa, rotulosFiltros } from '@/lib/nomeEmpresa';
import { useToast } from '@/components/ui/use-toast';

const fmt = (v) => (v === 0 ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cor = (v) => (v < 0 ? 'text-red-600 dark:text-red-400' : '');

function DRE() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [abertas, setAbertas] = useState(new Set());
  const { toast } = useToast();
  const [gerandoPdf, setGerandoPdf] = useState(false);
  // retiradas de sócios (9.2) como remuneração dentro das despesas: lembra a escolha neste navegador
  const [retiradasComoDespesa, setRetiradasComoDespesa] = useState(() => { try { return localStorage.getItem('dre_retiradas_despesa') === '1'; } catch { return false; } });
  const alternarRetiradas = (v) => { setRetiradasComoDespesa(v); try { localStorage.setItem('dre_retiradas_despesa', v ? '1' : '0'); } catch { /* sem armazenamento */ } };

  const dre = useMemo(
    () => (ano ? montarDRE(movs, { ano, categorias, subcategorias, retiradasComoDespesa }) : null),
    [movs, ano, categorias, subcategorias, retiradasComoDespesa]
  );

  const alternar = (chave) => setAbertas((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });

  const exportPDF = async () => {
    if (!dre) return;
    setGerandoPdf(true);
    try {
      const empresaNome = await buscarNomeEmpresa(empresaId, dados.empresas?.find((e) => e.id === empresaId)?.razao_social || '');
      await gerarDreGerencialPdf({ empresaNome, ano, dre, retiradasComoDespesa, filtros: rotulosFiltros(dados) });
    } catch (e) {
      toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGerandoPdf(false);
    }
  };

  const exportCSV = () => {
    if (!dre) return;
    const linhas = [['Conta', ...MESES.map((m) => `${m}/${String(ano).slice(2)}`), 'Total']];
    for (const l of dre.linhas) {
      linhas.push([l.rotulo, ...l.valores.map((v) => v.toFixed(2)), l.total.toFixed(2)]);
      for (const d of l.detalhes) linhas.push([`   ${d.rotulo}`, ...d.valores.map((v) => v.toFixed(2)), d.total.toFixed(2)]);
    }
    linhas.push([]);
    linhas.push(['RESULTADO DE CAIXA']);
    for (const l of dre.caixa.linhas) linhas.push([l.rotulo, ...l.valores.map((v) => v.toFixed(2)), l.total.toFixed(2)]);
    linhas.push(['= GERAÇÃO DE CAIXA DO MÊS', ...dre.caixa.geracao.valores.map((v) => v.toFixed(2)), dre.caixa.geracao.total.toFixed(2)]);
    const csv = '﻿' + linhas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `dre_gerencial_${ano}.csv`;
    link.click();
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const p = dre?.porChave;
  const semMovimento = dre && movs.length === 0;
  const grafico = dre ? MESES.map((m, i) => ({ name: m, 'Receita líquida': p.receita_liquida.valores[i], 'Lucro líquido': p.lucro_liquido.valores[i] })) : [];

  return (
    <>
      <Helmet><title>DRE Gerencial - Engagement ERP</title></Helmet>
      <PageHeader
        title="DRE Gerencial"
        description="Demonstração do resultado no regime de caixa, a partir do extrato bancário classificado."
        action={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPDF} disabled={!dre || loading || semMovimento || gerandoPdf} className="gap-2">{gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Exportar PDF</Button>
            <Button onClick={exportCSV} disabled={!dre || loading || semMovimento} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
          </div>
        )}
      />

      <FiltrosGerenciais dados={dados}>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" title="Quando o sócio retira dinheiro no lugar do pró-labore, a retirada (9.2) passa a ser despesa e reduz o lucro.">
          <Checkbox checked={retiradasComoDespesa} onCheckedChange={(v) => alternarRetiradas(v === true)} />
          Retiradas de sócios como despesa
        </label>
      </FiltrosGerenciais>

      {!empresaId ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle>
          <CardDescription className="max-w-md mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription>
        </Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading || !dre ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : semMovimento ? (
        <Card className="py-12 text-center">
          <CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle>
          <CardDescription className="mt-2">Importe o extrato do banco em Financeiro &gt; Importar Extrato para montar a DRE.</CardDescription>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-blue-600">Receita bruta</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(p.receita_bruta.total)}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-green-600">Lucro líquido</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${cor(p.lucro_liquido.total)}`}>R$ {fmt(p.lucro_liquido.total)}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-purple-600">Margem líquida</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{p.receita_bruta.total > 0 ? ((p.lucro_liquido.total / p.receita_bruta.total) * 100).toFixed(1) : '0,0'}%</div></CardContent></Card>
            <Card className={p.nao_classificado.total !== 0 ? 'border-amber-500/50' : ''}>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-amber-600">Ainda não classificado</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {fmt(p.nao_classificado.total)}</div>
                {p.nao_classificado.total !== 0 && <Link to="/financeiro/classificar-extrato" className="text-xs text-blue-600 underline">Classificar agora</Link>}
              </CardContent>
            </Card>
          </div>

          {p.nao_classificado.total !== 0 && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Há R$ {fmt(Math.abs(p.nao_classificado.total))} em lançamentos sem categoria. Eles <strong>não entram</strong> nas linhas da DRE; por isso o resultado pode estar melhor ou pior do que é de verdade até serem classificados.</span>
            </div>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle>Receita líquida x lucro líquido</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => `R$ ${fmt(v)}`} />
                    <Legend />
                    <Bar dataKey="Receita líquida" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro líquido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>DRE {ano}</CardTitle></CardHeader>
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
                    {dre.linhas.map((l) => {
                      const aberta = abertas.has(l.chave);
                      const expansivel = l.detalhes.length > 0;
                      const subtotal = l.tipo === 'subtotal';
                      const pendente = l.chave === 'nao_classificado';
                      const fundo = subtotal ? 'bg-muted font-bold' : pendente ? 'bg-amber-500/10' : '';
                      return (
                        <React.Fragment key={l.chave}>
                          {l.chave === 'socios' && <tr><td colSpan={14} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">Fora da DRE (entram no caixa)</td></tr>}
                          {l.chave === 'repasse_clientes' && <tr><td colSpan={14} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">Fora da DRE e do caixa (dinheiro que só passa pela empresa)</td></tr>}
                          <tr className={`border-b border-border ${fundo} ${expansivel ? 'cursor-pointer hover:bg-muted/50' : ''}`} onClick={() => expansivel && alternar(l.chave)}>
                            <td className={`px-3 py-2 text-left sticky left-0 ${subtotal ? 'bg-muted' : pendente ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-background'}`}>
                              <span className="inline-flex items-center gap-1">
                                {expansivel ? (aberta ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="w-3.5" />}
                                {l.rotulo}
                              </span>
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
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Clique numa linha para ver as contas. Repasses de clientes e transferências entre contas não entram no resultado nem no caixa da empresa.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultado de caixa {ano}</CardTitle>
              <CardDescription>Do lucro líquido à geração de caixa: mostra se o lucro paga os empréstimos, os investimentos e as retiradas dos sócios.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right min-w-[1100px]">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-left sticky left-0 bg-muted min-w-[300px]">Linha</th>
                      {MESES.map((m) => <th key={m} className="px-3 py-2">{m}/{String(ano).slice(2)}</th>)}
                      <th className="px-3 py-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dre.caixa.linhas.map((l) => (
                      <tr key={l.chave} className={`border-b border-border ${l.chave === 'nao_classificado' ? 'bg-amber-500/10' : ''}`}>
                        <td className="px-3 py-2 text-left sticky left-0 bg-background">{l.rotulo}</td>
                        {l.valores.map((v, i) => <td key={i} className={`px-3 py-2 ${cor(v)}`}>{fmt(v)}</td>)}
                        <td className={`px-3 py-2 font-bold ${cor(l.total)}`}>{fmt(l.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted font-bold">
                      <td className="px-3 py-2 text-left sticky left-0 bg-muted">= Geração de caixa do mês</td>
                      {dre.caixa.geracao.valores.map((v, i) => <td key={i} className={`px-3 py-2 ${cor(v)}`}>{fmt(v)}</td>)}
                      <td className={`px-3 py-2 ${cor(dre.caixa.geracao.total)}`}>{fmt(dre.caixa.geracao.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Os juros de empréstimos já estão no lucro (7.2.05). Se a parcela inteira for lançada como amortização (11.2), os juros somem do resultado: lance os juros em 7.2.05.</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

export default DRE;
