import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  listarLancamentos, faturasDoCartao, resumoCartao, criarLancamentos, atualizarLancamento, excluirLancamento, excluirCartao,
  gerarFatura, sugerirClassificacao, cicloDaCompra, rotuloCiclo, moeda, fmtData, hojeISO
} from '@/lib/cartaoService';
import CartaoFormDialog from './CartaoFormDialog';

const sel = 'h-9 rounded-md border border-input bg-background px-2 text-sm w-full';
const novoLanc = () => ({ data: hojeISO(), descricao: '', valor: '', categoria_id: '', subcategoria_id: '', centro_custo_id: '', parcelas: 1 });

const CartaoDetalhe = () => {
  const { id } = useParams();
  const { company_id: companyId, user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cartao, setCartao] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('lancamentos');
  const [f, setF] = useState(novoLanc());
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const [c, lan, fat, cat, sub, cen] = await Promise.all([
        supabase.from('cartoes').select('*').eq('id', id).single(),
        listarLancamentos(id), faturasDoCartao(id),
        supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', companyId).order('ordem'),
        supabase.from('subcategorias').select('id, codigo, nome, categoria_id').eq('company_id', companyId).order('codigo'),
        supabase.from('centros_custo').select('id, codigo, nome').eq('company_id', companyId).eq('ativo', true).order('codigo')
      ]);
      if (c.error) throw new Error(c.error.message);
      setCartao(c.data); setLancamentos(lan); setFaturas(fat); setCategorias(cat.data || []); setSubcategorias(sub.data || []); setCentros(cen.data || []);
    } catch (e) { toast({ title: 'Erro ao carregar o cartão', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, id, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const r = useMemo(() => (cartao ? resumoCartao(cartao, lancamentos, faturas) : null), [cartao, lancamentos, faturas]);
  const subsDe = (catId) => subcategorias.filter((s) => s.categoria_id === catId);
  const nomeCat = (cid) => categorias.find((x) => x.id === cid);

  const sugerir = async () => {
    if (!f.descricao.trim() || f.categoria_id) return;
    try {
      const s = await sugerirClassificacao(companyId, f.descricao);
      if (s) setF((x) => ({ ...x, categoria_id: s.categoria_id || '', subcategoria_id: s.subcategoria_id || '', centro_custo_id: s.centro_custo_id || x.centro_custo_id }));
    } catch { /* sem sugestão */ }
  };

  const lancar = async () => {
    if (!f.descricao.trim() || !f.data || !(Number(f.valor) !== 0) || Number.isNaN(Number(f.valor))) { toast({ title: 'Informe a data, a descrição e o valor', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      await criarLancamentos(companyId, id, { ...f, valor: Number(f.valor) });
      setF(novoLanc());
      await carregar();
    } catch (e) { toast({ title: 'Não foi possível lançar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const reclassificar = async (l, campos) => {
    try { await atualizarLancamento(l.id, campos); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível reclassificar', description: e.message, variant: 'destructive' }); }
  };
  const apagar = async (l) => {
    if (!window.confirm(`Apagar o lançamento "${l.descricao}"?`)) return;
    try { await excluirLancamento(l.id); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível apagar', description: e.message, variant: 'destructive' }); }
  };
  const faturar = async (ciclo) => {
    try { await gerarFatura(companyId, cartao, ciclo.ciclo, ciclo.valor, user?.id); toast({ title: 'Fatura gerada', description: `${rotuloCiclo(ciclo.ciclo)} · ${moeda(ciclo.valor)} · vence ${fmtData(ciclo.vencimento)}` }); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível gerar a fatura', description: e.message, variant: 'destructive' }); }
  };
  const apagarCartao = async () => {
    if (!window.confirm(`Apagar o cartão "${cartao.nome}" e todos os lançamentos dele? As faturas já geradas continuam em Contas a pagar. Não dá para desfazer.`)) return;
    try { await excluirCartao(id); navigate('/financeiro/cartoes'); }
    catch (e) { toast({ title: 'Não foi possível apagar', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!cartao) return <p className="text-sm text-muted-foreground py-10 text-center">Cartão não encontrado. Se ele é de outra empresa, troque de cadastro no topo da tela.</p>;

  return (
    <>
      <Helmet><title>{cartao.nome} | Cartões</title></Helmet>
      <PageHeader title={cartao.nome} icon={CreditCard}
        description={[cartao.bandeira, cartao.final && `final ${cartao.final}`, `fecha dia ${cartao.dia_fechamento}`, `vence dia ${cartao.dia_vencimento}`].filter(Boolean).join(' · ')}
        action={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-1" onClick={() => setEditando(true)}><Pencil className="h-4 w-4" /> Editar cartão</Button><Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={apagarCartao}><Trash2 className="h-4 w-4" /> Apagar</Button><Button variant="outline" size="sm" onClick={() => navigate('/financeiro/cartoes')}><ArrowLeft className="h-4 w-4 mr-1" /> Cartões</Button></div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gasto no mês</div><div className="text-lg font-bold">{moeda(r.gastoMes)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Fatura aberta · fecha {fmtData(r.faturaAberta.fechamento).slice(0, 5)}</div><div className="text-lg font-bold">{moeda(r.faturaAberta.valor)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{r.aPagar ? `A pagar · vence ${fmtData(r.aPagar.vencimento).slice(0, 5)}` : 'A pagar'}</div><div className="text-lg font-bold text-red-600">{r.aPagar ? moeda(r.aPagar.valor) : '—'}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Limite disponível</div><div className="text-lg font-bold text-emerald-600">{moeda(r.disponivel)}</div><div className="text-[11px] text-muted-foreground">{moeda(r.utilizado)} usados de {moeda(r.limite)}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 mb-4">
        {[['lancamentos', `Lançamentos (${lancamentos.length})`], ['faturas', `Faturas (${r.ciclos.length})`]].map(([k, t]) => (
          <button key={k} type="button" onClick={() => setAba(k)} className={`px-3 py-1.5 rounded-md border text-sm ${aba === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>{t}</button>
        ))}
      </div>

      {aba === 'lancamentos' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Novo lançamento</CardTitle><CardDescription>Compra no cartão. Valor negativo para estorno ou crédito. Compra parcelada cai nas faturas dos meses seguintes.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                <div><Label className="text-xs">Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
                <div className="md:col-span-2"><Label className="text-xs">Descrição</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} onBlur={sugerir} placeholder="ex.: NETFLIX COM" /></div>
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></div>
                <div><Label className="text-xs">Parcelas</Label><Input type="number" min="1" max="60" value={f.parcelas} onChange={(e) => setF({ ...f, parcelas: e.target.value })} /></div>
                <div />
                <div className="md:col-span-2"><Label className="text-xs">Categoria</Label>
                  <select className={sel} value={f.categoria_id} onChange={(e) => setF({ ...f, categoria_id: e.target.value, subcategoria_id: '' })}><option value="">— escolha —</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nome}</option>)}</select></div>
                <div className="md:col-span-2"><Label className="text-xs">Subcategoria</Label>
                  <select className={sel} value={f.subcategoria_id} onChange={(e) => setF({ ...f, subcategoria_id: e.target.value })} disabled={!f.categoria_id}><option value="">— escolha —</option>{subsDe(f.categoria_id).map((s) => <option key={s.id} value={s.id}>{s.codigo} {s.nome}</option>)}</select></div>
                {centros.length > 0 && (
                  <div className="md:col-span-2"><Label className="text-xs">Centro de custo</Label>
                    <select className={sel} value={f.centro_custo_id} onChange={(e) => setF({ ...f, centro_custo_id: e.target.value })}><option value="">— nenhum —</option>{centros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                )}
                <div className="md:col-span-2 flex items-end"><Button onClick={lancar} disabled={salvando} className="gap-1 w-full">{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lançar</Button></div>
              </div>
              {f.data && <p className="text-xs text-muted-foreground mt-2">Esta compra cai na fatura de {rotuloCiclo(cicloDaCompra(f.data, cartao.dia_fechamento))}.</p>}
            </CardContent>
          </Card>
          <div className="rounded-lg border border-border overflow-x-auto bg-card">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Data</th><th className="text-left p-2">Descrição</th><th className="text-left p-2 w-56">Categoria</th><th className="text-left p-2 w-56">Subcategoria</th>{centros.length > 0 && <th className="text-left p-2 w-36">Centro</th>}<th className="text-right p-2">Valor</th><th className="text-left p-2">Fatura</th><th className="p-2" /></tr></thead>
              <tbody className="divide-y divide-border">
                {lancamentos.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhum lançamento ainda.</td></tr>}
                {lancamentos.map((l) => (
                  <tr key={l.id}>
                    <td className="p-2 whitespace-nowrap">{fmtData(l.data_compra)}</td>
                    <td className="p-2">{l.descricao}{l.observacoes && <div className="text-[11px] text-muted-foreground">{l.observacoes}</div>}</td>
                    <td className="p-2"><select className={sel} value={l.categoria_id || ''} onChange={(e) => reclassificar(l, { categoria_id: e.target.value || null, subcategoria_id: null })}><option value="">— sem categoria —</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nome}</option>)}</select></td>
                    <td className="p-2"><select className={sel} value={l.subcategoria_id || ''} onChange={(e) => reclassificar(l, { subcategoria_id: e.target.value || null })} disabled={!l.categoria_id}><option value="">—</option>{subsDe(l.categoria_id).map((s) => <option key={s.id} value={s.id}>{s.codigo} {s.nome}</option>)}</select></td>
                    {centros.length > 0 && <td className="p-2"><select className={sel} value={l.centro_custo_id || ''} onChange={(e) => reclassificar(l, { centro_custo_id: e.target.value || null })}><option value="">—</option>{centros.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></td>}
                    <td className={`p-2 text-right font-medium whitespace-nowrap ${Number(l.valor) < 0 ? 'text-emerald-600' : ''}`}>{moeda(l.valor)}</td>
                    <td className="p-2 text-xs whitespace-nowrap">{rotuloCiclo(cicloDaCompra(l.data_compra, cartao.dia_fechamento))}</td>
                    <td className="p-2"><button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => apagar(l)}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto bg-card">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Fatura</th><th className="text-left p-3">Fecha</th><th className="text-left p-3">Vence</th><th className="text-right p-3">Valor</th><th className="text-left p-3">Situação</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-border">
              {[...r.ciclos].reverse().map((c) => {
                const diferente = c.fatura && !c.paga && Math.abs(Number(c.fatura.valor_total) - c.valor) > 0.005;
                return (
                  <tr key={c.ciclo}>
                    <td className="p-3 font-medium">{c.rotulo}</td>
                    <td className="p-3">{fmtData(c.fechamento)}</td>
                    <td className="p-3">{fmtData(c.vencimento)}</td>
                    <td className="p-3 text-right font-medium">{moeda(c.valor)}</td>
                    <td className="p-3">
                      {c.paga ? <Badge variant="success">Paga</Badge> : c.fatura ? <Badge variant="outline">{diferente ? `Título de ${moeda(c.fatura.valor_total)} (desatualizado)` : 'Título a pagar gerado'}</Badge> : c.fechada ? <Badge variant="destructive">Fechada, sem título</Badge> : <Badge variant="secondary">Aberta</Badge>}
                    </td>
                    <td className="p-3 text-right">{!c.paga && c.valor !== 0 && (!c.fatura || diferente) && <Button size="sm" variant="outline" onClick={() => faturar(c)}>{c.fatura ? 'Atualizar título' : 'Gerar título a pagar'}</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground p-3 border-t border-border">O título a pagar da fatura entra em Contas a pagar, na categoria de pagamento de fatura de cartão, e some do limite usado quando você dá a baixa nele.</p>
        </div>
      )}
      <CartaoFormDialog aberto={editando} onFechar={() => setEditando(false)} companyId={companyId} cartao={cartao} onSalvo={carregar} />
    </>
  );
};

export default CartaoDetalhe;
