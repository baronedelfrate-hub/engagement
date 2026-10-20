import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, FileDown, Save, Copy, UserPlus, Send, CheckCircle2, XCircle, ShoppingCart } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  listarContas, listarOportunidades, listarCatalogo, carregarConfig, carregarProposta, criarProposta, atualizarProposta, salvarItens,
  gerarNumeroProposta, moverEtapa, totalItem, totalProposta, dividirParcelas, conteudoPadrao, paginasPadrao, PAGINAS,
  STATUS_PROPOSTA, moeda, hojeISO
} from '@/lib/crmService';
import { criarClienteDaProposta, rotaDaFicha } from '@/lib/crmCliente';
import { gerarPedidoDaProposta } from '@/lib/crmPedido';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const COR = { rascunho: 'outline', enviada: 'warning', aceita: 'success', recusada: 'destructive', expirada: 'secondary' };
const merge = (padrao, atual) => {
  const out = { ...padrao };
  Object.keys(atual || {}).forEach((k) => { out[k] = { ...(padrao[k] || {}), ...(atual[k] || {}) }; });
  return out;
};

const Campo = ({ rotulo, children, className = '' }) => <div className={className}><Label className="text-xs">{rotulo}</Label>{children}</div>;

const CRMPropostaEditor = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nova = id === 'nova';
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoPedido, setGerandoPedido] = useState(false);
  const [contas, setContas] = useState([]);
  const [ops, setOps] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [inst, setInst] = useState({});
  const [ehEngagement, setEhEngagement] = useState(false);
  const [p, setP] = useState(null);
  const [itens, setItens] = useState([]);
  const [conteudo, setConteudo] = useState(conteudoPadrao());
  const [paginas, setPaginas] = useState(paginasPadrao());
  const [parcelas, setParcelas] = useState([]);
  const [nParcelas, setNParcelas] = useState(4);
  const [sujo, setSujo] = useState(false);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const [c, o, cat, cfg, emp] = await Promise.all([
        listarContas(companyId), listarOportunidades(companyId), listarCatalogo(companyId), carregarConfig(companyId),
        supabase.from('empresas').select('equipe_engagement').eq('id', companyId).maybeSingle()
      ]);
      setContas(c); setOps(o); setCatalogo(cat.filter((x) => x.ativo)); setInst(cfg); setEhEngagement(!!emp?.data?.equipe_engagement);
      if (nova) {
        const op = o.find((x) => x.id === params.get('oportunidade'));
        setP({
          id: null, numero: '', versao: 1, status: 'rascunho', data_emissao: hojeISO(), validade_dias: 30, desconto: 0,
          conta_id: op?.conta_id || '', oportunidade_id: op?.id || '', titulo: op ? op.titulo : '', subtitulo: ''
        });
        setItens([]); setConteudo(conteudoPadrao()); setPaginas(paginasPadrao()); setParcelas([]);
      } else {
        const x = await carregarProposta(id);
        setP({ ...x, conta_id: x.conta_id || '', oportunidade_id: x.oportunidade_id || '', subtitulo: x.subtitulo || '' });
        setItens(x.itens.map((i) => ({ ...i })));
        setConteudo(merge(conteudoPadrao(), x.conteudo));
        setPaginas({ ...paginasPadrao(), ...x.paginas });
        setParcelas(x.parcelas || []);
      }
      setSujo(false);
    } catch (e) { toast({ title: 'Erro ao carregar a proposta', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, id, nova, params, toast]);

  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const total = useMemo(() => totalProposta(itens, p?.desconto), [itens, p?.desconto]);
  const somaParcelas = parcelas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const conta = contas.find((c) => c.id === p?.conta_id) || p?.conta || null;
  const opsDaConta = ops.filter((o) => !p?.conta_id || o.conta_id === p.conta_id);

  const mudaP = (k, v) => { setP((x) => ({ ...x, [k]: v })); setSujo(true); };
  const mudaC = (pagina, k, v) => { setConteudo((c) => ({ ...c, [pagina]: { ...c[pagina], [k]: v } })); setSujo(true); };
  const mudaItem = (idx, campos) => { setItens((l) => l.map((x, i) => (i === idx ? { ...x, ...campos } : x))); setSujo(true); };

  const addDoCatalogo = (catId) => {
    const c = catalogo.find((x) => x.id === catId);
    if (!c) return;
    setItens((l) => [...l, { catalogo_id: c.id, descricao: c.nome, quantidade: 1, preco_unitario: Number(c.preco) || 0, desconto: 0 }]);
    setSujo(true);
  };

  const salvar = async (extra = {}) => {
    if (!p.titulo.trim()) { toast({ title: 'Dê um título à proposta', variant: 'destructive' }); return null; }
    if (!p.conta_id) { toast({ title: 'Escolha o cliente (conta) da proposta', variant: 'destructive' }); return null; }
    setSalvando(true);
    try {
      const dados = {
        conta_id: p.conta_id, oportunidade_id: p.oportunidade_id || null, titulo: p.titulo.trim(), subtitulo: p.subtitulo || null,
        data_emissao: p.data_emissao, validade_dias: Number(p.validade_dias) || 30, desconto: Number(p.desconto) || 0,
        valor_total: total, parcelas, paginas, conteudo, ...extra
      };
      let salva;
      if (p.id) salva = await atualizarProposta(p.id, dados);
      else salva = await criarProposta(companyId, { ...dados, numero: await gerarNumeroProposta(companyId), versao: 1, status: 'rascunho' });
      await salvarItens(companyId, salva.id, itens);
      setSujo(false);
      toast({ title: 'Proposta salva' });
      if (!p.id) navigate(`/crm/propostas/${salva.id}`, { replace: true }); else await carregar();
      return salva;
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); return null; }
    finally { setSalvando(false); }
  };

  const gerarPdf = async () => {
    setGerando(true);
    try {
      const { gerarPropostaPdf } = await import('@/lib/crmPropostaPdf');
      await gerarPropostaPdf({
        proposta: { ...p, valor_total: total, parcelas, paginas, conteudo, numero: p.numero || 'RASCUNHO' },
        conta, itens: itens.map((i) => ({ ...i, quantidade: Number(i.quantidade) || 0, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0 })), institucional: inst
      });
    } catch (e) { toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' }); }
    finally { setGerando(false); }
  };

  const mudarStatus = async (status) => {
    const salva = await salvar({ status, ...(status === 'enviada' ? { enviada_em: new Date().toISOString() } : {}), ...(status === 'aceita' ? { aceita_em: new Date().toISOString() } : {}) });
    if (!salva) return;
    try {
      if (p.oportunidade_id) {
        const op = ops.find((o) => o.id === p.oportunidade_id);
        if (status === 'enviada' && op && ['lead', 'contato', 'reuniao'].includes(op.etapa)) await moverEtapa(op.id, 'proposta');
        if (status === 'aceita' && op && op.etapa !== 'ganho') await moverEtapa(op.id, 'ganho');
      }
    } catch (e) { toast({ title: 'Proposta atualizada, mas o funil não foi movido', description: e.message, variant: 'destructive' }); }
    if (status === 'aceita') await gerarPedido(salva.id, true);
    await carregar();
  };

  // Proposta aceita vira pedido de venda (base da nota). Pode ser chamado no aceite ou depois, pelo botão.
  const gerarPedido = async (propostaId, automatico = false) => {
    setGerandoPedido(true);
    try {
      const x = await carregarProposta(propostaId || p.id);
      const r = await gerarPedidoDaProposta({ proposta: x, catalogo, companyId });
      if (r.jaExistia) { toast({ title: 'Esta proposta já gerou um pedido de venda' }); }
      else {
        toast({ title: 'Pedido de venda gerado', description: `Pedido ${r.pedido.numero} criado e pronto para faturamento.${r.avisos.length ? ' ' + r.avisos.join(' ') : ''}` });
      }
    } catch (e) {
      toast({ title: automatico ? 'Proposta aceita, mas o pedido não foi gerado' : 'Não foi possível gerar o pedido', description: e.message, variant: 'destructive' });
    } finally { setGerandoPedido(false); }
    if (!automatico) await carregar();
  };

  const novaVersao = async () => {
    if (sujo) { toast({ title: 'Salve as alterações antes de criar uma nova versão', variant: 'destructive' }); return; }
    try {
      const v = await criarProposta(companyId, {
        conta_id: p.conta_id, oportunidade_id: p.oportunidade_id || null, numero: p.numero, versao: (p.versao || 1) + 1, titulo: p.titulo, subtitulo: p.subtitulo || null,
        status: 'rascunho', data_emissao: hojeISO(), validade_dias: p.validade_dias, desconto: p.desconto, valor_total: total, parcelas, paginas, conteudo
      });
      await salvarItens(companyId, v.id, itens);
      toast({ title: `Versão ${v.versao} criada` });
      navigate(`/crm/propostas/${v.id}`);
    } catch (e) { toast({ title: 'Não foi possível criar a versão', description: e.message, variant: 'destructive' }); }
  };

  const criarCliente = async () => {
    try {
      const x = await carregarProposta(p.id);
      const r = await criarClienteDaProposta({ proposta: x, itens: x.itens, catalogo });
      toast({ title: r.jaExistia ? 'Esta proposta já tem cliente. Abrindo a ficha.' : 'Cliente criado a partir da proposta' });
      navigate(rotaDaFicha(r.cliente, r.servicos));
    } catch (e) { toast({ title: 'Não foi possível criar o cliente', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;
  if (!p) return null;

  const frentes = conteudo.escopo.frentes;
  const fases = conteudo.cronograma.fases;

  return (
    <>
      <Helmet><title>{p.numero || 'Nova proposta'} | CRM</title></Helmet>
      <PageHeader
        title={nova ? 'Nova proposta' : `${p.numero}${p.versao > 1 ? ` v${p.versao}` : ''}`}
        description={nova ? 'Preencha os dados, os valores e o conteúdo das páginas. O número é gerado ao salvar.' : `${conta?.nome || ''} · emitida em ${p.data_emissao?.split('-').reverse().join('/')}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!nova && <Badge variant={COR[p.status]}>{STATUS_PROPOSTA[p.status]}</Badge>}
            <Button variant="outline" size="sm" onClick={() => navigate('/crm/propostas')}><ArrowLeft className="w-4 h-4 mr-2" /> Propostas</Button>
            <Button variant="outline" size="sm" onClick={gerarPdf} disabled={gerando}>{gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}PDF</Button>
            <Button size="sm" onClick={() => salvar()} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar{sujo ? ' *' : ''}</Button>
          </div>
        }
      />

      {!nova && (
        <div className="flex flex-wrap gap-2 mb-4">
          {p.status === 'rascunho' && <Button variant="outline" size="sm" onClick={() => mudarStatus('enviada')}><Send className="w-4 h-4 mr-2" /> Marcar como enviada</Button>}
          {['rascunho', 'enviada'].includes(p.status) && <Button variant="outline" size="sm" onClick={() => mudarStatus('aceita')}><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Cliente aceitou</Button>}
          {['rascunho', 'enviada'].includes(p.status) && <Button variant="outline" size="sm" onClick={() => mudarStatus('recusada')}><XCircle className="w-4 h-4 mr-2 text-red-600" /> Cliente recusou</Button>}
          <Button variant="outline" size="sm" onClick={novaVersao}><Copy className="w-4 h-4 mr-2" /> Nova versão</Button>
          {p.pedido_venda_id ? <Button variant="outline" size="sm" onClick={() => navigate(`/vendas/pedidos/${p.pedido_venda_id}`)}><ShoppingCart className="w-4 h-4 mr-2" /> Abrir pedido de venda</Button> : (p.status === 'aceita' && <Button size="sm" onClick={() => gerarPedido()} disabled={gerandoPedido}>{gerandoPedido ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}Gerar pedido de venda</Button>)}
          {ehEngagement && <Button size="sm" onClick={criarCliente}><UserPlus className="w-4 h-4 mr-2" /> Criar cliente a partir da proposta</Button>}
        </div>
      )}

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="valores">Valores</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo das páginas</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <Card><CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo rotulo="Cliente (conta) *"><select className={sel} value={p.conta_id} onChange={(e) => { mudaP('conta_id', e.target.value); mudaP('oportunidade_id', ''); }}><option value="">— escolha —</option>{contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
              <Campo rotulo="Oportunidade (opcional)"><select className={sel} value={p.oportunidade_id} onChange={(e) => mudaP('oportunidade_id', e.target.value)}><option value="">—</option>{opsDaConta.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}</select></Campo>
            </div>
            <Campo rotulo="Título da proposta *"><Input value={p.titulo} onChange={(e) => mudaP('titulo', e.target.value)} placeholder="ex.: Estruturação da empresa Deia Cypri" /></Campo>
            <Campo rotulo="Subtítulo (aparece na capa)"><Textarea rows={2} value={p.subtitulo} onChange={(e) => mudaP('subtitulo', e.target.value)} placeholder="Uma frase sobre o objetivo da proposta" /></Campo>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Campo rotulo="Data de emissão"><Input type="date" value={p.data_emissao} onChange={(e) => mudaP('data_emissao', e.target.value)} /></Campo>
              <Campo rotulo="Validade (dias)"><Input type="number" min="1" value={p.validade_dias} onChange={(e) => mudaP('validade_dias', e.target.value)} /></Campo>
              {!nova && <Campo rotulo="Número"><Input value={p.numero} readOnly /></Campo>}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="valores" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Itens da proposta</CardTitle><CardDescription>Escolha do catálogo ou digite um item livre.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {itens.length > 0 && (
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-1">Descrição</th><th className="p-1 w-20">Qtd</th><th className="p-1 w-32">Unitário</th><th className="p-1 w-28">Desconto</th><th className="text-right p-1 w-28">Total</th><th className="w-8" /></tr></thead>
                  <tbody>{itens.map((i, idx) => (
                    <tr key={idx}>
                      <td className="p-1"><Input value={i.descricao} onChange={(e) => mudaItem(idx, { descricao: e.target.value })} /></td>
                      <td className="p-1"><Input type="number" min="0" step="0.01" value={i.quantidade} onChange={(e) => mudaItem(idx, { quantidade: e.target.value })} /></td>
                      <td className="p-1"><Input type="number" min="0" step="0.01" value={i.preco_unitario} onChange={(e) => mudaItem(idx, { preco_unitario: e.target.value })} /></td>
                      <td className="p-1"><Input type="number" min="0" step="0.01" value={i.desconto} onChange={(e) => mudaItem(idx, { desconto: e.target.value })} /></td>
                      <td className="p-1 text-right font-medium">{moeda(totalItem(i))}</td>
                      <td className="p-1"><button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setItens((l) => l.filter((_, k) => k !== idx)); setSujo(true); }}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>))}</tbody>
                </table></div>
              )}
              <div className="flex flex-wrap gap-2">
                <select className={`${sel} max-w-sm`} value="" onChange={(e) => { addDoCatalogo(e.target.value); e.target.value = ''; }}><option value="">+ Adicionar do catálogo…</option>{catalogo.map((c) => <option key={c.id} value={c.id}>{c.nome}{Number(c.preco) ? ` — ${moeda(c.preco)}` : ''}</option>)}</select>
                <Button variant="outline" size="sm" onClick={() => { setItens((l) => [...l, { catalogo_id: null, descricao: '', quantidade: 1, preco_unitario: 0, desconto: 0 }]); setSujo(true); }}><Plus className="w-4 h-4 mr-1" /> Item livre</Button>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-3">
                <Campo rotulo="Desconto geral (R$)" className="w-44"><Input type="number" min="0" step="0.01" value={p.desconto} onChange={(e) => mudaP('desconto', e.target.value)} /></Campo>
                <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Valor total</div><div className="text-3xl font-bold">{moeda(total)}</div></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parcelas</CardTitle><CardDescription>Como o cliente paga. As parcelas aparecem na página de investimento.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <Campo rotulo="Dividir em" className="w-28"><Input type="number" min="1" max="12" value={nParcelas} onChange={(e) => setNParcelas(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} /></Campo>
                <Button variant="outline" size="sm" onClick={() => { setParcelas(dividirParcelas(total, nParcelas)); setSujo(true); }}>Dividir {moeda(total)} em {nParcelas}x</Button>
                <Button variant="ghost" size="sm" onClick={() => { setParcelas((l) => [...l, { rotulo: '', valor: 0 }]); setSujo(true); }}><Plus className="w-4 h-4 mr-1" /> Parcela</Button>
              </div>
              {parcelas.map((x, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_160px_32px] gap-2">
                  <Input placeholder="Rótulo (ex.: Aceite, 30 dias)" value={x.rotulo} onChange={(e) => { setParcelas((l) => l.map((y, k) => (k === idx ? { ...y, rotulo: e.target.value } : y))); setSujo(true); }} />
                  <Input type="number" min="0" step="0.01" value={x.valor} onChange={(e) => { setParcelas((l) => l.map((y, k) => (k === idx ? { ...y, valor: Number(e.target.value) } : y))); setSujo(true); }} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => { setParcelas((l) => l.filter((_, k) => k !== idx)); setSujo(true); }}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {parcelas.length > 0 && <div className={`text-sm ${Math.abs(somaParcelas - total) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>Soma das parcelas: {moeda(somaParcelas)}{Math.abs(somaParcelas - total) < 0.01 ? ' — confere com o total.' : ` — diferente do total (${moeda(total)}).`}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conteudo" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quais páginas entram</CardTitle><CardDescription>A capa sempre entra. "Quem somos" e "Valores" usam os textos fixos da empresa (menu Propostas &gt; Textos da proposta).</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PAGINAS.map((pg) => (
                <label key={pg.id} className="flex items-center gap-2 text-sm"><Checkbox checked={paginas[pg.id] !== false} onCheckedChange={(v) => { setPaginas((x) => ({ ...x, [pg.id]: v === true })); setSujo(true); }} />{pg.rotulo}{pg.fixa && <span className="text-xs text-muted-foreground">(texto fixo)</span>}</label>
              ))}
            </CardContent>
          </Card>

          {paginas.ponto_partida !== false && (
            <Card><CardHeader><CardTitle className="text-base">O ponto de partida</CardTitle></CardHeader><CardContent className="space-y-3">
              <Campo rotulo="Título"><Input value={conteudo.ponto_partida.titulo} onChange={(e) => mudaC('ponto_partida', 'titulo', e.target.value)} /></Campo>
              <div className="text-xs text-muted-foreground">Números em destaque (ex.: "R$ 15 mil" — "de custo mensal inicial")</div>
              {conteudo.ponto_partida.destaques.map((d, i) => (
                <div key={i} className="grid grid-cols-[160px_1fr_32px] gap-2">
                  <Input placeholder="Valor" value={d.valor} onChange={(e) => mudaC('ponto_partida', 'destaques', conteudo.ponto_partida.destaques.map((x, k) => (k === i ? { ...x, valor: e.target.value } : x)))} />
                  <Input placeholder="Descrição" value={d.rotulo} onChange={(e) => mudaC('ponto_partida', 'destaques', conteudo.ponto_partida.destaques.map((x, k) => (k === i ? { ...x, rotulo: e.target.value } : x)))} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => mudaC('ponto_partida', 'destaques', conteudo.ponto_partida.destaques.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('ponto_partida', 'destaques', [...conteudo.ponto_partida.destaques, { valor: '', rotulo: '' }])}><Plus className="w-4 h-4 mr-1" /> Destaque</Button>
              <Campo rotulo="Nossa estratégia"><Textarea rows={3} value={conteudo.ponto_partida.estrategia} onChange={(e) => mudaC('ponto_partida', 'estrategia', e.target.value)} /></Campo>
            </CardContent></Card>
          )}

          {paginas.objetivo !== false && (
            <Card><CardHeader><CardTitle className="text-base">Objetivo do projeto</CardTitle></CardHeader><CardContent className="space-y-3">
              <Campo rotulo="Título"><Input value={conteudo.objetivo.titulo} onChange={(e) => mudaC('objetivo', 'titulo', e.target.value)} /></Campo>
              <Campo rotulo="Subtítulo"><Textarea rows={2} value={conteudo.objetivo.subtitulo} onChange={(e) => mudaC('objetivo', 'subtitulo', e.target.value)} /></Campo>
              {conteudo.objetivo.pecas.map((pc, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr_32px] gap-2">
                  <Input placeholder="Peça" value={pc.titulo} onChange={(e) => mudaC('objetivo', 'pecas', conteudo.objetivo.pecas.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} />
                  <Input placeholder="Descrição" value={pc.texto} onChange={(e) => mudaC('objetivo', 'pecas', conteudo.objetivo.pecas.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => mudaC('objetivo', 'pecas', conteudo.objetivo.pecas.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('objetivo', 'pecas', [...conteudo.objetivo.pecas, { titulo: '', texto: '' }])}><Plus className="w-4 h-4 mr-1" /> Peça</Button>
            </CardContent></Card>
          )}

          {paginas.escopo !== false && (
            <Card><CardHeader><CardTitle className="text-base">Escopo e frentes</CardTitle><CardDescription>Uma frente por bloco; um item por linha.</CardDescription></CardHeader><CardContent className="space-y-4">
              {frentes.map((f, i) => (
                <div key={i} className="rounded-md border border-border p-3 space-y-2">
                  <div className="grid grid-cols-[1fr_200px_32px] gap-2 items-end">
                    <Campo rotulo={`Frente ${String(i + 1).padStart(2, '0')}`}><Input value={f.titulo} onChange={(e) => mudaC('escopo', 'frentes', frentes.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} /></Campo>
                    <Campo rotulo="Destaque (opcional)"><Input placeholder="Prioridade inicial" value={f.prioridade || ''} onChange={(e) => mudaC('escopo', 'frentes', frentes.map((x, k) => (k === i ? { ...x, prioridade: e.target.value } : x)))} /></Campo>
                    <button type="button" className="text-muted-foreground hover:text-destructive mb-2" onClick={() => mudaC('escopo', 'frentes', frentes.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <Textarea rows={4} value={(f.itens || []).join('\n')} onChange={(e) => mudaC('escopo', 'frentes', frentes.map((x, k) => (k === i ? { ...x, itens: e.target.value.split('\n') } : x)))} placeholder="Um item por linha" />
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('escopo', 'frentes', [...frentes, { titulo: '', prioridade: '', itens: [''] }])}><Plus className="w-4 h-4 mr-1" /> Frente</Button>
            </CardContent></Card>
          )}

          {paginas.cronograma !== false && (
            <Card><CardHeader><CardTitle className="text-base">Cronograma</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <Campo rotulo="Título"><Input value={conteudo.cronograma.titulo} onChange={(e) => mudaC('cronograma', 'titulo', e.target.value)} /></Campo>
                <Campo rotulo="Total de semanas"><Input type="number" min="1" max="52" value={conteudo.cronograma.semanas} onChange={(e) => mudaC('cronograma', 'semanas', Number(e.target.value) || 1)} /></Campo>
              </div>
              {fases.map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_90px_32px] gap-2">
                  <Input placeholder="Fase" value={f.nome} onChange={(e) => mudaC('cronograma', 'fases', fases.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} />
                  <Input type="number" min="1" placeholder="de (sem.)" value={f.de} onChange={(e) => mudaC('cronograma', 'fases', fases.map((x, k) => (k === i ? { ...x, de: Number(e.target.value) } : x)))} />
                  <Input type="number" min="1" placeholder="até (sem.)" value={f.ate} onChange={(e) => mudaC('cronograma', 'fases', fases.map((x, k) => (k === i ? { ...x, ate: Number(e.target.value) } : x)))} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => mudaC('cronograma', 'fases', fases.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('cronograma', 'fases', [...fases, { nome: '', de: 1, ate: 1 }])}><Plus className="w-4 h-4 mr-1" /> Fase</Button>
              <Campo rotulo="Observação de prazos"><Textarea rows={2} value={conteudo.cronograma.nota} onChange={(e) => mudaC('cronograma', 'nota', e.target.value)} /></Campo>
            </CardContent></Card>
          )}

          {paginas.investimento !== false && (
            <Card><CardHeader><CardTitle className="text-base">Investimento</CardTitle><CardDescription>O valor e as parcelas vêm da aba Valores.</CardDescription></CardHeader><CardContent className="space-y-3">
              <Campo rotulo="Título"><Input value={conteudo.investimento.titulo} onChange={(e) => mudaC('investimento', 'titulo', e.target.value)} /></Campo>
              <Campo rotulo="Observação (rodapé da página)"><Textarea rows={2} value={conteudo.investimento.nota} onChange={(e) => mudaC('investimento', 'nota', e.target.value)} placeholder="ex.: Se o diagnóstico identificar volume acima do previsto, escopo e valor podem ser revistos em comum acordo." /></Campo>
            </CardContent></Card>
          )}

          {paginas.condicoes !== false && (
            <Card><CardHeader><CardTitle className="text-base">Condições comerciais</CardTitle></CardHeader><CardContent className="space-y-3">
              <Campo rotulo="Título"><Input value={conteudo.condicoes.titulo} onChange={(e) => mudaC('condicoes', 'titulo', e.target.value)} /></Campo>
              {conteudo.condicoes.itens.map((c, i) => (
                <div key={i} className="grid grid-cols-[130px_200px_1fr_32px] gap-2">
                  <Input placeholder="Destaque" value={c.valor} onChange={(e) => mudaC('condicoes', 'itens', conteudo.condicoes.itens.map((x, k) => (k === i ? { ...x, valor: e.target.value } : x)))} />
                  <Input placeholder="Título" value={c.titulo} onChange={(e) => mudaC('condicoes', 'itens', conteudo.condicoes.itens.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} />
                  <Input placeholder="Texto" value={c.texto} onChange={(e) => mudaC('condicoes', 'itens', conteudo.condicoes.itens.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => mudaC('condicoes', 'itens', conteudo.condicoes.itens.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('condicoes', 'itens', [...conteudo.condicoes.itens, { valor: '', titulo: '', texto: '' }])}><Plus className="w-4 h-4 mr-1" /> Condição</Button>
            </CardContent></Card>
          )}

          {paginas.proximos_passos !== false && (
            <Card><CardHeader><CardTitle className="text-base">Próximos passos</CardTitle></CardHeader><CardContent className="space-y-3">
              <Campo rotulo="Título"><Input value={conteudo.proximos_passos.titulo} onChange={(e) => mudaC('proximos_passos', 'titulo', e.target.value)} /></Campo>
              {conteudo.proximos_passos.passos.map((c, i) => (
                <div key={i} className="grid grid-cols-[220px_1fr_32px] gap-2">
                  <Input placeholder="Passo" value={c.titulo} onChange={(e) => mudaC('proximos_passos', 'passos', conteudo.proximos_passos.passos.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} />
                  <Input placeholder="Complemento" value={c.texto} onChange={(e) => mudaC('proximos_passos', 'passos', conteudo.proximos_passos.passos.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} />
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => mudaC('proximos_passos', 'passos', conteudo.proximos_passos.passos.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => mudaC('proximos_passos', 'passos', [...conteudo.proximos_passos.passos, { titulo: '', texto: '' }])}><Plus className="w-4 h-4 mr-1" /> Passo</Button>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CRMPropostaEditor;
