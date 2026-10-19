import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, FileDown, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { carregarDiagnostico, salvarDiagnostico } from '@/lib/engService';
import {
  SECOES_QUESTIONARIO, CONSOLIDACAO, DIMENSOES_MATURIDADE, ESCALA_MATURIDADE, TOTAL_ITENS_MATURIDADE,
  calcularMaturidade, faixaVolume, planoRecomendado, EXPLICACAO_NIVEL
} from '@/lib/engDiagnosticoConfig';

const COR_NIVEL = { 'Caótico': 'text-red-600', 'Básico': 'text-orange-600', 'Organizado': 'text-yellow-600', 'Estruturado': 'text-emerald-600' };

const Opcoes = ({ pergunta, valor, onChange }) => {
  const multipla = pergunta.tipo === 'multipla';
  const marcado = (o) => (multipla ? (valor || []).includes(o) : valor === o);
  const alternar = (o) => {
    if (multipla) {
      const atual = valor || [];
      onChange(atual.includes(o) ? atual.filter((x) => x !== o) : [...atual, o]);
    } else {
      onChange(valor === o ? '' : o);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {pergunta.opcoes.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => alternar(o)}
          className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${marcado(o) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
};

const Pergunta = ({ pergunta, valor, onChange }) => (
  <div className="py-3 border-b border-border last:border-0">
    <div className="text-sm font-medium text-foreground mb-2"><span className="text-muted-foreground mr-1">{pergunta.id}</span>{pergunta.texto}</div>
    {pergunta.tipo === 'texto' && <Input value={valor || ''} onChange={(e) => onChange(e.target.value)} />}
    {pergunta.tipo === 'numero' && <Input type="number" min="0" className="max-w-[180px]" value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />}
    {pergunta.tipo === 'area' && <Textarea rows={3} value={valor || ''} onChange={(e) => onChange(e.target.value)} />}
    {(pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') && <Opcoes pergunta={pergunta} valor={valor} onChange={onChange} />}
    {pergunta.dica && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Nota interna: {pergunta.dica}</p>}
  </div>
);

const DiagnosticoTab = ({ cliente, consultorNome }) => {
  const { toast } = useToast();
  const [diag, setDiag] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [maturidade, setMaturidade] = useState(Array(TOTAL_ITENS_MATURIDADE).fill(null));
  const [consolidacao, setConsolidacao] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarDiagnostico(cliente.id).then((d) => {
      if (!vivo) return;
      setDiag(d);
      if (d) {
        setRespostas(d.respostas || {});
        const m = Array.isArray(d.maturidade) ? d.maturidade : [];
        setMaturidade(Array.from({ length: TOTAL_ITENS_MATURIDADE }, (_, i) => (Number.isInteger(m[i]) ? m[i] : null)));
        setConsolidacao(d.consolidacao || {});
      }
    }).catch((e) => toast({ title: 'Erro ao carregar o diagnóstico', description: e.message, variant: 'destructive' }))
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, [cliente.id, toast]);

  const res = useMemo(() => calcularMaturidade(maturidade), [maturidade]);
  const lancamentos = respostas['7.2'];
  const faixa = faixaVolume(lancamentos);
  const sugestao = planoRecomendado(res.nivel, lancamentos);

  const campos = (status) => {
    const volume = {};
    SECOES_QUESTIONARIO.flatMap((s) => s.perguntas).filter((p) => p.volume).forEach((p) => {
      if (respostas[p.id] !== undefined && respostas[p.id] !== '') volume[p.volume] = String(respostas[p.id]);
    });
    return {
      respostas, maturidade, volume, consolidacao,
      plano_final: consolidacao['C.3'] || null,
      ...(status ? { status } : {})
    };
  };

  const salvar = async (status) => {
    setSalvando(true);
    try {
      const d = await salvarDiagnostico(cliente.id, diag?.id, campos(status));
      setDiag(d);
      setSujo(false);
      toast({ title: status === 'concluido' ? 'Diagnóstico concluído' : 'Diagnóstico salvo' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const gerarPdf = async () => {
    setGerando(true);
    try {
      const { gerarDiagnosticoPdf } = await import('@/lib/engDiagnosticoPdf');
      const d = { ...(diag || {}), ...campos(), plano_recomendado: sugestao, data: diag?.data };
      await gerarDiagnosticoPdf({ cliente, diagnostico: d, consultorNome });
    } catch (e) {
      toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGerando(false);
    }
  };

  const mudaResposta = (id, v) => { setRespostas((r) => ({ ...r, [id]: v })); setSujo(true); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  let base = 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {diag?.status === 'concluido' ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge> : <Badge variant="outline">Rascunho</Badge>}
          {sujo && <span className="text-xs text-amber-600">alterações não salvas</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={gerarPdf} disabled={gerando}>{gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}Relatório de diagnóstico (PDF)</Button>
          <Button variant="outline" onClick={() => salvar()} disabled={salvando}><Save className="w-4 h-4 mr-2" />Salvar</Button>
          <Button onClick={() => salvar('concluido')} disabled={salvando}><CheckCircle2 className="w-4 h-4 mr-2" />Concluir diagnóstico</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
          <CardDescription>Calculado automaticamente a partir do diagnóstico de maturidade e do volume informado.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">Índice de maturidade</div>
            <div className="text-3xl font-bold">{res.indice === null ? '—' : `${res.indice}/100`}</div>
            <div className={`text-sm font-medium ${COR_NIVEL[res.nivel] || ''}`}>{res.nivel || 'preencha os 16 itens abaixo'}</div>
            <div className="text-xs text-muted-foreground mt-1">{res.respondidos}/{TOTAL_ITENS_MATURIDADE} itens respondidos</div>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">Faixa de volume</div>
            <div className="text-3xl font-bold">{faixa || '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">{lancamentos !== undefined && lancamentos !== '' ? `${lancamentos} lançamentos/mês` : 'informe a pergunta 7.2'}</div>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">Plano recomendado</div>
            <div className="text-xl font-bold">{consolidacao['C.3'] || sugestao || '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">{consolidacao['C.3'] && sugestao && consolidacao['C.3'] !== sugestao ? `sugestão da matriz: ${sugestao}` : 'pela matriz maturidade × volume'}</div>
          </div>
          {res.nivel && <p className="md:col-span-3 text-sm text-muted-foreground">{EXPLICACAO_NIVEL[res.nivel]}</p>}
        </CardContent>
      </Card>

      {SECOES_QUESTIONARIO.map((s) => (
        <Card key={s.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{s.id}. {s.titulo}</CardTitle>
            {s.nota && <CardDescription>{s.nota}</CardDescription>}
          </CardHeader>
          <CardContent>
            {s.perguntas.map((p) => <Pergunta key={p.id} pergunta={p} valor={respostas[p.id]} onChange={(v) => mudaResposta(p.id, v)} />)}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnóstico de maturidade</CardTitle>
          <CardDescription>Avalie cada item de 0 a 3. Esta parte é preenchida pelo consultor depois da entrevista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {DIMENSOES_MATURIDADE.map((d) => {
            const inicio = base;
            base += d.itens.length;
            return (
              <div key={d.id}>
                <div className="text-sm font-semibold mb-1">{d.id}. {d.titulo}</div>
                {d.itens.map((it, i) => (
                  <div key={it} className="py-2 border-b border-border last:border-0">
                    <div className="text-sm mb-1.5">{it}</div>
                    <div className="flex flex-wrap gap-2">
                      {ESCALA_MATURIDADE.map((e) => (
                        <button
                          key={e.valor}
                          type="button"
                          onClick={() => { setMaturidade((m) => m.map((v, k) => (k === inicio + i ? (v === e.valor ? null : e.valor) : v))); setSujo(true); }}
                          className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${maturidade[inicio + i] === e.valor ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                        >
                          {e.valor} · {e.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-amber-300/60">
        <CardHeader>
          <CardTitle className="text-base">Consolidação — uso interno Engagement</CardTitle>
          <CardDescription>Não aparece no relatório do cliente. É a ponte entre o diagnóstico e a proposta comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          {CONSOLIDACAO.map((p) => (
            <Pergunta key={p.id} pergunta={p} valor={consolidacao[p.id]} onChange={(v) => { setConsolidacao((c) => ({ ...c, [p.id]: v })); setSujo(true); }} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiagnosticoTab;
