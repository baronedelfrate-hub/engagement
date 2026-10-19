import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, AlertCircle, Building2, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { montarDRE, calcularPEPeriodo, MESES } from '@/lib/dreGerencial';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = (v) => `R$ ${fmt(v)}`;
const pct = (v) => `${(Number(v || 0) * 100).toFixed(1).replace('.', ',')}%`;

// Quanto a receita ficou acima ou abaixo do ponto de equilíbrio, em reais e em %, com barra de cobertura (0% a 200% do PE)
const Situacao = ({ p }) => {
  if (!p.temDado) return <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Sem movimento no período.</div>;
  if (p.peImpossivel) {
    return <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400"><strong>Sem ponto de equilíbrio:</strong> a margem de contribuição é negativa, então nenhuma receita cobre os custos fixos.</div>;
  }
  const largura = p.cobertura === null ? 0 : Math.min(p.cobertura, 2) / 2 * 100;
  return (
    <div className="space-y-2">
      <div className={`rounded-md border p-3 ${p.acima ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
        <div className={`text-xl font-bold ${p.acima ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
          {brl(Math.abs(p.folga))} {p.acima ? 'acima' : 'abaixo'} do ponto de equilíbrio
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {p.acima
            ? `Margem de segurança de ${pct(p.margemSeguranca)}: a receita pode cair isso e ainda cobrir os custos.`
            : `Faltou faturar ${brl(Math.abs(p.folga))} para cobrir os custos. A receita cobriu ${pct(p.cobertura)} do ponto de equilíbrio.`}
        </div>
      </div>
      <div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${p.acima ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${largura}%` }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/70" style={{ left: '50%' }} title="Ponto de equilíbrio (100%)" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0%</span><span>PE = 100%</span><span>200%</span></div>
      </div>
    </div>
  );
};

const CartaoPE = ({ titulo, subtitulo, p }) => (
  <Card className="border-2">
    <CardHeader className="pb-2">
      <CardDescription className="uppercase text-xs font-semibold tracking-wide">{titulo}</CardDescription>
      <CardTitle className="text-sm font-normal text-muted-foreground">{subtitulo}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Ponto de equilíbrio</div>
          <div className="text-4xl font-bold text-blue-700 dark:text-blue-400">{p.peImpossivel ? '—' : brl(p.pe)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Receita bruta</div>
          <div className="text-2xl font-semibold">{brl(p.receita)}</div>
        </div>
      </div>

      <Situacao p={p} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-1">
        <div><div className="text-xs text-muted-foreground">Custos fixos</div><div className="font-medium">{brl(p.fixos)}</div></div>
        <div><div className="text-xs text-muted-foreground">Custos variáveis</div><div className="font-medium">{brl(p.variaveis)}</div></div>
        <div><div className="text-xs text-muted-foreground">Margem de contribuição</div><div className="font-medium">{pct(p.mcPct)}</div></div>
        <div><div className="text-xs text-muted-foreground">Resultado (MC − fixos)</div><div className={`font-medium ${p.resultado < 0 ? 'text-red-600' : ''}`}>{brl(p.resultado)}</div></div>
      </div>
    </CardContent>
  </Card>
);

function PontoEquilibrio() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [mes, setMes] = useState(null);
  const [sim, setSim] = useState({ receita: 0, fixos: 0, variavelPct: 0 });

  const dre = useMemo(() => (ano ? montarDRE(movs, { ano, categorias, subcategorias }) : null), [movs, ano, categorias, subcategorias]);

  const porMes = useMemo(() => (dre ? Array.from({ length: 12 }, (_, i) => ({ i, ...calcularPEPeriodo(dre, i, i) })) : []), [dre]);
  const mesesComDado = porMes.filter((m) => m.temDado);

  // mês inicial: o último com movimento no ano
  useEffect(() => {
    if (!mesesComDado.length) return;
    setMes((atual) => (atual !== null && mesesComDado.some((m) => m.i === atual) ? atual : mesesComDado[mesesComDado.length - 1].i));
  }, [dre]);

  const doMes = dre && mes !== null ? porMes[mes] : null;
  const acumulado = useMemo(() => (dre && mes !== null ? calcularPEPeriodo(dre, 0, mes) : null), [dre, mes]);

  // simulação parte dos números do mês escolhido
  const baseSim = useMemo(() => (doMes
    ? { receita: doMes.receita, fixos: doMes.fixos, variavelPct: doMes.receita > 0 ? (doMes.variaveis / doMes.receita) * 100 : 0 }
    : { receita: 0, fixos: 0, variavelPct: 0 }), [doMes]);
  useEffect(() => { setSim(baseSim); }, [baseSim]);

  const margemSim = 1 - sim.variavelPct / 100;
  const peSim = margemSim > 0 ? sim.fixos / margemSim : 0;
  const folgaSim = sim.receita - peSim;
  const lucroSim = sim.receita * margemSim - sim.fixos;
  const simMudou = Math.abs(sim.receita - baseSim.receita) > 0.005 || Math.abs(sim.fixos - baseSim.fixos) > 0.005 || Math.abs(sim.variavelPct - baseSim.variavelPct) > 0.005;

  const grafico = mesesComDado.map((m) => ({ mes: MESES[m.i], 'Receita bruta': m.receita, 'Ponto de equilíbrio': m.peImpossivel ? 0 : m.pe }));

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>Ponto de Equilíbrio - ERP Platform</title></Helmet>
      <PageHeader title="Ponto de Equilíbrio" description="Quanto a empresa precisa faturar para cobrir os custos, e quanto sobrou ou faltou, mês a mês e no acumulado do ano." />

      <FiltrosGerenciais dados={dados}>
        <Select value={mes === null ? '' : String(mes)} onValueChange={(v) => setMes(Number(v))} disabled={!mesesComDado.length}>
          <SelectTrigger className="w-40 bg-background"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>{mesesComDado.map((m) => <SelectItem key={m.i} value={String(m.i)}>{MESES[m.i]}/{ano}</SelectItem>)}</SelectContent>
        </Select>
      </FiltrosGerenciais>

      {!empresaId ? (
        <Card className="flex flex-col items-center py-16 text-center"><Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" /><CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle><CardDescription className="mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription></Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading || !dre ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : mesesComDado.length === 0 || !doMes ? (
        <Card className="py-12 text-center"><CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle><CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato.</CardDescription></Card>
      ) : (
        <div className="space-y-6">
          {Math.abs(dre.porChave.nao_classificado.total) > 0.5 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Há {brl(Math.abs(dre.porChave.nao_classificado.total))} em lançamentos de {ano} <strong>ainda sem classificação</strong>. Eles ficam fora destes cálculos, então os custos podem estar subestimados e o ponto de equilíbrio real é provavelmente maior. Classifique em Financeiro &gt; Classificar Extrato.</span>
            </div>
          )}

          {/* 1) em destaque: mês e acumulado */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CartaoPE titulo="No mês" subtitulo={`${MESES[mes]}/${ano}`} p={doMes} />
            <CartaoPE titulo="Acumulado do ano" subtitulo={`${MESES[0]} a ${MESES[mes]}/${ano}`} p={acumulado} />
          </div>

          {/* 2) simulação de cenário, compacta */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-semibold">Simulação de cenário</h3>
                  <p className="text-xs text-muted-foreground">Parte dos números de {MESES[mes]}/{ano}. Mude os valores para ver o novo ponto de equilíbrio.</p>
                </div>
                {simMudou && <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSim(baseSim)}><RotateCcw className="h-3.5 w-3.5" /> Voltar aos números reais</Button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1 md:col-span-1"><Label className="text-xs">Receita (R$)</Label><Input type="number" className="h-9" value={Math.round(sim.receita * 100) / 100} onChange={(e) => setSim({ ...sim, receita: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-1 md:col-span-1"><Label className="text-xs">Custos fixos (R$)</Label><Input type="number" className="h-9" value={Math.round(sim.fixos * 100) / 100} onChange={(e) => setSim({ ...sim, fixos: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-1 md:col-span-1"><Label className="text-xs">Custo variável (% da receita)</Label><Input type="number" className="h-9" value={Math.round(sim.variavelPct * 100) / 100} onChange={(e) => setSim({ ...sim, variavelPct: parseFloat(e.target.value) || 0 })} /></div>
                <div className="md:col-span-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md bg-muted p-2"><div className="text-[11px] text-muted-foreground">PE do cenário</div><div className="font-bold text-blue-700 dark:text-blue-400">{margemSim > 0 ? brl(peSim) : '—'}</div></div>
                  <div className="rounded-md bg-muted p-2"><div className="text-[11px] text-muted-foreground">{folgaSim >= 0 ? 'Acima do PE' : 'Abaixo do PE'}</div><div className={`font-bold ${folgaSim >= 0 && margemSim > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{margemSim > 0 ? brl(Math.abs(folgaSim)) : '—'}</div></div>
                  <div className="rounded-md bg-muted p-2"><div className="text-[11px] text-muted-foreground">Lucro projetado</div><div className={`font-bold ${lucroSim < 0 ? 'text-red-600' : ''}`}>{brl(lucroSim)}</div></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3) mês a mês */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base">Receita x ponto de equilíbrio</CardTitle></CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => brl(v)} />
                    <Legend />
                    <Bar dataKey="Receita bruta" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ponto de equilíbrio" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-base">Detalhe por mês</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left py-2">Mês</th>
                        <th className="text-right">Receita</th>
                        <th className="text-right">Ponto de equilíbrio</th>
                        <th className="text-right">Sobrou / faltou</th>
                        <th className="text-right">Cobertura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mesesComDado.map((m) => (
                        <tr key={m.i} className={m.i === mes ? 'bg-blue-500/10 font-medium' : 'cursor-pointer hover:bg-muted/40'} onClick={() => setMes(m.i)}>
                          <td className="py-2">{MESES[m.i]}/{String(ano).slice(2)}</td>
                          <td className="text-right">{fmt(m.receita)}</td>
                          <td className="text-right">{m.peImpossivel ? '—' : fmt(m.pe)}</td>
                          <td className={`text-right ${m.peImpossivel || !m.acima ? 'text-red-600' : 'text-emerald-600'}`}>{m.peImpossivel ? '—' : `${m.acima ? '+' : '−'}${fmt(Math.abs(m.folga))}`}</td>
                          <td className="text-right">{m.cobertura === null ? '—' : pct(m.cobertura)}</td>
                        </tr>
                      ))}
                      {acumulado && (
                        <tr className="border-t-2 border-border font-semibold">
                          <td className="py-2">Acumulado</td>
                          <td className="text-right">{fmt(acumulado.receita)}</td>
                          <td className="text-right">{acumulado.peImpossivel ? '—' : fmt(acumulado.pe)}</td>
                          <td className={`text-right ${acumulado.peImpossivel || !acumulado.acima ? 'text-red-600' : 'text-emerald-600'}`}>{acumulado.peImpossivel ? '—' : `${acumulado.acima ? '+' : '−'}${fmt(Math.abs(acumulado.folga))}`}</td>
                          <td className="text-right">{acumulado.cobertura === null ? '—' : pct(acumulado.cobertura)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">PE = custos fixos ÷ margem de contribuição (%). Clique num mês para ver o detalhe em destaque. Lançamentos ainda não classificados ficam de fora do cálculo.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default PontoEquilibrio;
