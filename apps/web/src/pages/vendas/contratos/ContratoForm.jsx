import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, Save, Percent } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { moeda, totalItem, hojeISO } from '@/lib/crmService';
import {
  carregarContrato, criarContrato, atualizarContrato, excluirContrato, gerarNumeroContrato, valorMensal, registrarReajuste,
  rotuloCompetencia, fatorDaCompetencia, dataFaturamento, dataVencimento, liberarCompetencia
} from '@/lib/crmContratos';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
const C = ({ rotulo, children, className = '' }) => <div className={className}><Label className="text-xs">{rotulo}</Label>{children}</div>;

const ContratoForm = () => {
  const { id } = useParams();
  const novo = !id || id === 'novo';
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [c, setC] = useState(null);
  const [itens, setItens] = useState([]);
  const [historico, setHistorico] = useState({ faturamentos: [], reajustes: [] });
  const [reajuste, setReajuste] = useState(null);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const [cl, sv] = await Promise.all([
        supabase.from('clientes').select('id, nome').eq('company_id', companyId).order('nome'),
        supabase.from('servicos').select('id, nome, preco').eq('company_id', companyId).order('nome')
      ]);
      setClientes(cl.data || []); setServicos(sv.data || []);
      if (novo) {
        setC({ cliente_id: '', numero: '', titulo: '', status: 'ativo', data_inicio: hojeISO(), data_fim: '', vigencia_meses: '', dia_faturamento: 15, dia_vencimento: 15, proporcional: true, reajuste_mes: '', reajuste_indice: '', observacoes: '' });
        setItens([]);
      } else {
        const x = await carregarContrato(id);
        setC({ ...x, data_fim: x.data_fim || '', vigencia_meses: x.vigencia_meses ?? '', reajuste_mes: x.reajuste_mes ?? '', reajuste_indice: x.reajuste_indice || '', observacoes: x.observacoes || '' });
        setItens(x.itens);
        setHistorico({ faturamentos: x.faturamentos, reajustes: x.reajustes });
      }
    } catch (e) { toast({ title: 'Erro ao carregar o contrato', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, id, novo, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const mensal = useMemo(() => valorMensal(itens), [itens]);
  const muda = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const mudaItem = (i, campos) => setItens((l) => l.map((x, k) => (k === i ? { ...x, ...campos } : x)));

  const previa = useMemo(() => {
    if (!c?.data_inicio) return null;
    const comp = `${c.data_inicio.slice(0, 7)}-01`;
    const f = fatorDaCompetencia({ ...c, data_fim: c.data_fim || null }, comp);
    return { rotulo: rotuloCompetencia(comp), valor: Math.round(mensal * f.fator * 100) / 100, ...f, faturamento: dataFaturamento(c, comp), vencimento: dataVencimento(c, comp) };
  }, [c, mensal]);

  const salvar = async () => {
    if (!c.cliente_id) { toast({ title: 'Escolha o cliente', variant: 'destructive' }); return; }
    if (!c.titulo.trim()) { toast({ title: 'Dê um título ao contrato', variant: 'destructive' }); return; }
    if (!itens.length || itens.some((i) => !i.servico_id || !(Number(i.preco_unitario) > 0))) { toast({ title: 'Cada item precisa de um serviço e de um valor', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const dados = {
        cliente_id: c.cliente_id, titulo: c.titulo.trim(), status: c.status, data_inicio: c.data_inicio, data_fim: c.data_fim || null,
        vigencia_meses: c.vigencia_meses === '' ? null : Number(c.vigencia_meses), dia_faturamento: Number(c.dia_faturamento) || 15, dia_vencimento: Number(c.dia_vencimento) || 15,
        proporcional: !!c.proporcional, reajuste_mes: c.reajuste_mes === '' ? null : Number(c.reajuste_mes), reajuste_indice: c.reajuste_indice || null, observacoes: c.observacoes || null
      };
      if (novo) {
        const criado = await criarContrato(companyId, { ...dados, numero: await gerarNumeroContrato(companyId) }, itens);
        toast({ title: 'Contrato criado' });
        navigate(`/vendas/contratos/${criado.id}`, { replace: true });
      } else {
        await atualizarContrato(companyId, id, dados, itens);
        toast({ title: 'Contrato salvo' });
        await carregar();
      }
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const aplicar = async () => {
    const pct = Number(reajuste.percentual);
    if (!Number.isFinite(pct) || pct === 0) { toast({ title: 'Informe o percentual do reajuste', variant: 'destructive' }); return; }
    try {
      const r = await registrarReajuste(companyId, { ...c, itens }, pct, reajuste.indice);
      toast({ title: 'Reajuste aplicado', description: `${moeda(r.antes)} → ${moeda(r.depois)} por mês. Vale a partir das próximas competências.` });
      setReajuste(null);
      await carregar();
    } catch (e) { toast({ title: 'Não foi possível aplicar o reajuste', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver os contratos dela.</p>;
  if (!c) return null;

  return (
    <>
      <Helmet><title>{novo ? 'Novo contrato' : c.numero} | Contratos</title></Helmet>
      <PageHeader
        title={novo ? 'Novo contrato recorrente' : c.numero}
        description={novo ? 'Cadastre o cliente, os serviços mensais e as regras de cobrança.' : `${c.cliente?.nome || ''} · ${moeda(mensal)} por mês`}
        action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate('/vendas/contratos')}><ArrowLeft className="w-4 h-4 mr-2" /> Contratos</Button>{!novo && <Button variant="outline" size="sm" onClick={() => setReajuste({ percentual: '', indice: c.reajuste_indice || '' })}><Percent className="w-4 h-4 mr-2" /> Aplicar reajuste</Button>}<Button size="sm" onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar</Button></div>}
      />

      <div className="space-y-4 max-w-5xl">
        <Card><CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <C rotulo="Cliente *"><select className={sel} value={c.cliente_id} onChange={(e) => muda('cliente_id', e.target.value)} disabled={!novo}><option value="">— escolha —</option>{clientes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></C>
            <C rotulo="Título *"><Input value={c.titulo} onChange={(e) => muda('titulo', e.target.value)} placeholder="ex.: BPO Financeiro E5 — Plano Essencial" /></C>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <C rotulo="Início do contrato"><Input type="date" value={c.data_inicio} onChange={(e) => muda('data_inicio', e.target.value)} /></C>
            <C rotulo="Fim (opcional)"><Input type="date" value={c.data_fim} onChange={(e) => muda('data_fim', e.target.value)} /></C>
            <C rotulo="Vigência (meses)"><Input type="number" min="1" value={c.vigencia_meses} onChange={(e) => muda('vigencia_meses', e.target.value)} /></C>
            <C rotulo="Situação"><select className={sel} value={c.status} onChange={(e) => muda('status', e.target.value)}><option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="encerrado">Encerrado</option></select></C>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <C rotulo="Dia do faturamento (mês seguinte)"><Input type="number" min="1" max="28" value={c.dia_faturamento} onChange={(e) => muda('dia_faturamento', e.target.value)} /></C>
            <C rotulo="Dia do vencimento"><Input type="number" min="1" max="28" value={c.dia_vencimento} onChange={(e) => muda('dia_vencimento', e.target.value)} /></C>
            <C rotulo="Mês do reajuste anual"><select className={sel} value={c.reajuste_mes} onChange={(e) => muda('reajuste_mes', e.target.value)}><option value="">sem reajuste</option>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></C>
            <C rotulo="Índice do reajuste"><Input value={c.reajuste_indice} onChange={(e) => muda('reajuste_indice', e.target.value)} placeholder="IPCA, IGP-M, % fixo…" /></C>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!c.proporcional} onCheckedChange={(v) => muda('proporcional', v === true)} /> Cobrar proporcional aos dias no primeiro e no último mês</label>
          <C rotulo="Observações"><Textarea rows={2} value={c.observacoes} onChange={(e) => muda('observacoes', e.target.value)} /></C>
        </CardContent></Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Serviços mensais</CardTitle><CardDescription>Cada item usa um serviço do cadastro fiscal (Cadastros &gt; Serviços), que será o serviço da nota.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {itens.map((i, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_70px_120px_110px_32px] gap-2 items-center">
                <select className={sel} value={i.servico_id || ''} onChange={(e) => { const s = servicos.find((x) => x.id === e.target.value); mudaItem(idx, { servico_id: e.target.value, descricao: i.descricao || s?.nome || '', preco_unitario: i.preco_unitario || s?.preco || 0 }); }}><option value="">Serviço…</option>{servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
                <Input placeholder="Descrição na nota/pedido" value={i.descricao} onChange={(e) => mudaItem(idx, { descricao: e.target.value })} />
                <Input type="number" min="1" step="1" value={i.quantidade} onChange={(e) => mudaItem(idx, { quantidade: e.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="Unitário" value={i.preco_unitario} onChange={(e) => mudaItem(idx, { preco_unitario: e.target.value })} />
                <Input type="number" min="0" step="0.01" placeholder="Desconto" value={i.desconto} onChange={(e) => mudaItem(idx, { desconto: e.target.value })} />
                <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setItens((l) => l.filter((_, k) => k !== idx))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {servicos.length === 0 && <p className="text-xs text-amber-700">Esta empresa ainda não tem serviços cadastrados. Eles são criados automaticamente quando uma proposta é aceita, ou em Cadastros &gt; Serviços.</p>}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setItens((l) => [...l, { servico_id: '', descricao: '', quantidade: 1, preco_unitario: '', desconto: 0 }])}><Plus className="w-4 h-4 mr-1" /> Serviço</Button>
              <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Valor mensal</div><div className="text-2xl font-bold">{moeda(mensal)}</div></div>
            </div>
          </CardContent>
        </Card>

        {previa && itens.length > 0 && (
          <Card><CardContent className="pt-5 text-sm">
            <span className="font-medium">Primeira cobrança:</span> competência {previa.rotulo}
            {previa.proporcional ? ` (proporcional: ${previa.dias} de ${previa.diasMes} dias)` : ' (mês cheio)'} = <span className="font-semibold">{moeda(previa.valor)}</span>, faturada em {fmt(previa.faturamento)}, vencimento em {fmt(previa.vencimento)}.
          </CardContent></Card>
        )}

        {!novo && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Faturamentos gerados</CardTitle></CardHeader>
              <CardContent>
                {historico.faturamentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma competência faturada ainda. Use "Faturamento do mês" no menu Vendas &gt; Contratos.</p> : (
                  <div className="divide-y divide-border">{historico.faturamentos.map((f) => (
                    <div key={f.id} className="py-2 flex items-center justify-between text-sm">
                      <span>Competência {rotuloCompetencia(String(f.competencia).slice(0, 10))}{f.proporcional && <Badge variant="outline" className="ml-2">{f.dias_cobrados}/{f.dias_mes} dias</Badge>}</span>
                      <span className="flex items-center gap-3"><span className="font-medium">{moeda(f.valor)}</span>{f.pedido_venda_id ? <Button variant="outline" size="sm" onClick={() => navigate(`/vendas/pedidos/${f.pedido_venda_id}`)}>Abrir pedido</Button> : <><Badge variant="warning">pedido excluído</Badge><Button variant="outline" size="sm" onClick={async () => { try { await liberarCompetencia(f.id); toast({ title: 'Competência liberada para faturar de novo' }); await carregar(); } catch (e) { toast({ title: 'Não foi possível liberar', description: e.message, variant: 'destructive' }); } }}>Liberar para faturar de novo</Button></>}</span>
                    </div>))}</div>
                )}
              </CardContent>
            </Card>
            {historico.reajustes.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Reajustes aplicados</CardTitle></CardHeader>
                <CardContent className="divide-y divide-border">{historico.reajustes.map((r) => (
                  <div key={r.id} className="py-2 flex justify-between text-sm"><span>{fmt(r.data)} · {Number(r.percentual).toLocaleString('pt-BR')}%{r.indice ? ` (${r.indice})` : ''}</span><span>{moeda(r.valor_antes)} → <span className="font-medium">{moeda(r.valor_depois)}</span></span></div>))}</CardContent>
              </Card>
            )}
            {historico.faturamentos.length === 0 && (
              <div><Button variant="ghost" className="text-destructive" onClick={async () => { if (window.confirm('Excluir este contrato?')) { try { await excluirContrato(id); navigate('/vendas/contratos'); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}>Excluir contrato</Button></div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!reajuste} onOpenChange={(o) => { if (!o) setReajuste(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar reajuste</DialogTitle></DialogHeader>
          {reajuste && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Os preços dos serviços sobem pelo percentual informado e valem a partir das competências ainda não faturadas. Hoje: <span className="font-medium">{moeda(mensal)}</span> por mês{Number(reajuste.percentual) ? <> → <span className="font-medium">{moeda(itens.reduce((s, i) => s + Math.max(0, (Number(i.quantidade) || 0) * Math.round((Number(i.preco_unitario) || 0) * (1 + Number(reajuste.percentual) / 100) * 100) / 100 - Math.round((Number(i.desconto) || 0) * (1 + Number(reajuste.percentual) / 100) * 100) / 100), 0))}</span></> : null}.</p>
              <div className="grid grid-cols-2 gap-3">
                <C rotulo="Percentual (%)"><Input type="number" step="0.01" value={reajuste.percentual} onChange={(e) => setReajuste({ ...reajuste, percentual: e.target.value })} placeholder="ex.: 4,5" /></C>
                <C rotulo="Índice (registro)"><Input value={reajuste.indice} onChange={(e) => setReajuste({ ...reajuste, indice: e.target.value })} placeholder="IPCA" /></C>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setReajuste(null)}>Cancelar</Button><Button onClick={aplicar}>Aplicar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContratoForm;
