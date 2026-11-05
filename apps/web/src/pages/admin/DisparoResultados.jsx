import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { CheckCircle2, Loader2, MessageCircle, Send, XCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { enviarWhatsApp, statusWhatsApp, telefoneValido, formatarTelefone } from '@/lib/whatsappService';
import { supabase } from '@/lib/customSupabaseClient';
import {
  listarEmpresas, nomeDaEmpresa, listarObras, listarBancos, listarPedidos, listarPropostasDaEmpresa,
  gerarMensal, gerarFinanceiro, gerarPrestacao, gerarExtrato, gerarPedido, gerarProposta, dataBR
} from '@/lib/disparoResultados';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const hoje = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Superadmin: gera relatórios de qualquer empresa e envia pelo WhatsApp da própria empresa dele.
const DisparoResultados = () => {
  const { toast } = useToast();
  const { company_id: empresaDoContexto, isSuperAdmin, loading: authLoading } = useAuthContext();
  const [remetentes, setRemetentes] = useState([]); // empresas que têm um WhatsApp conectado pelo sistema
  const [minhaEmpresa, setMinhaEmpresa] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [conectado, setConectado] = useState(null);
  const [obras, setObras] = useState([]); const [bancos, setBancos] = useState([]); const [pedidos, setPedidos] = useState([]); const [propostas, setPropostas] = useState([]);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(false);

  // parâmetros e marcação de cada relatório
  const [marcados, setMarcados] = useState({});
  const [p, setP] = useState({
    ano: hoje.getFullYear(), mes: hoje.getMonth() === 0 ? 0 : hoje.getMonth() - 1,
    pagarDe: iso(hoje), pagarAte: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)), pagarAberto: true,
    receberDe: iso(hoje), receberAte: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)), receberAberto: true,
    obraId: 'TODOS', obraDe: '', obraAte: '', bancoId: 'TODOS', extratoDe: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), extratoAte: iso(hoje),
    pedidoId: '', propostaId: ''
  });
  const [destinos, setDestinos] = useState('');
  const [abertura, setAbertura] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState([]);

  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const marca = (k) => (v) => setMarcados((m) => ({ ...m, [k]: v === true }));

  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    listarEmpresas().then(setEmpresas).catch((e) => toast({ title: 'Erro ao listar empresas', description: e.message, variant: 'destructive' }));
    supabase.from('whatsapp_instancias').select('company_id, empresa:empresas(razao_social, nome_fantasia)').then(({ data }) => {
      const lista = (data || []).map((r) => ({ id: r.company_id, nome: nomeDaEmpresa(r.empresa) }));
      setRemetentes(lista);
      setMinhaEmpresa((atual) => atual || (lista.find((x) => x.id === empresaDoContexto) ? empresaDoContexto : (lista[0]?.id || '')));
    });
  }, [authLoading, isSuperAdmin, empresaDoContexto, toast]);
  // estado da conexão do WhatsApp escolhido para enviar
  useEffect(() => {
    if (!minhaEmpresa) { setConectado(false); return; }
    setConectado(null);
    statusWhatsApp(minhaEmpresa).then((s) => setConectado(!!s?.conectado)).catch(() => setConectado(false));
  }, [minhaEmpresa]);

  const empresa = useMemo(() => empresas.find((e) => e.id === empresaId), [empresas, empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let vivo = true; setCarregandoEmpresa(true); setMarcados({}); setResultado([]);
    Promise.all([listarObras(empresaId), listarBancos(empresaId), listarPedidos(empresaId).catch(() => []), listarPropostasDaEmpresa(empresaId).catch(() => [])])
      .then(([o, b, pe, pr]) => { if (!vivo) return; setObras(o); setBancos(b); setPedidos(pe); setPropostas(pr); setP((x) => ({ ...x, obraId: 'TODOS', bancoId: 'TODOS', pedidoId: '', propostaId: '' })); setAbertura(`Olá! Seguem os resultados de ${nomeDaEmpresa(empresas.find((e) => e.id === empresaId))}.`); })
      .catch((e) => toast({ title: 'Erro ao carregar a empresa', description: e.message, variant: 'destructive' }))
      .finally(() => vivo && setCarregandoEmpresa(false));
    return () => { vivo = false; };
  }, [empresaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const itens = useMemo(() => [
    { k: 'mensal', titulo: 'Relatório mensal (DRE, ponto de equilíbrio e indicadores)', gerar: () => gerarMensal(empresaId, { ano: Number(p.ano), mes: Number(p.mes) }) },
    { k: 'pagar', titulo: 'Contas a pagar', gerar: () => gerarFinanceiro(empresaId, 'CONTAS_PAGAR', { de: p.pagarDe, ate: p.pagarAte, soEmAberto: p.pagarAberto }) },
    { k: 'receber', titulo: 'Contas a receber', gerar: () => gerarFinanceiro(empresaId, 'CONTAS_RECEBER', { de: p.receberDe, ate: p.receberAte, soEmAberto: p.receberAberto }) },
    { k: 'obra', titulo: 'Prestação de contas da obra', gerar: () => gerarPrestacao(empresaId, { obraId: p.obraId, de: p.obraDe, ate: p.obraAte }) },
    { k: 'extrato', titulo: 'Extrato conciliado', gerar: () => gerarExtrato(empresaId, { bancoId: p.bancoId, de: p.extratoDe, ate: p.extratoAte }) },
    { k: 'pedido', titulo: 'Pedido de compra', gerar: () => { if (!p.pedidoId) throw new Error('Escolha o pedido de compra.'); return gerarPedido(empresaId, p.pedidoId); } },
    { k: 'proposta', titulo: 'Proposta comercial', gerar: () => { if (!p.propostaId) throw new Error('Escolha a proposta.'); return gerarProposta(empresaId, p.propostaId); } }
  ], [empresaId, p]);

  const numeros = useMemo(() => [...new Set(destinos.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean))], [destinos]);
  const invalidos = numeros.filter((n) => !telefoneValido(n));
  const selecionados = itens.filter((i) => marcados[i.k]);
  const podeEnviar = !!empresaId && selecionados.length > 0 && numeros.length > 0 && invalidos.length === 0 && conectado && !enviando;

  const enviar = useCallback(async () => {
    setEnviando(true); setResultado([]);
    const log = [];
    const anota = (r) => { log.push(r); setResultado([...log]); };
    try {
      // 1) gera cada PDF uma vez
      const prontos = [];
      for (const it of selecionados) {
        try { prontos.push({ it, pdf: await it.gerar() }); anota({ ok: true, texto: `${it.titulo}: PDF gerado` }); }
        catch (e) { anota({ ok: false, texto: `${it.titulo}: ${e.message}` }); }
      }
      if (!prontos.length) { toast({ title: 'Nenhum relatório pôde ser gerado', variant: 'destructive' }); return; }
      // 2) envia, um número por vez: abertura em texto e depois cada PDF
      for (const para of numeros) {
        const comum = { tipo: 'outro', para, ref_tipo: 'disparo_resultados', ref_id: empresaId, empresa_id: minhaEmpresa };
        try {
          if (abertura.trim()) { await enviarWhatsApp({ ...comum, mensagem: abertura.trim() }); await esperar(900); }
          for (const { pdf } of prontos) {
            await enviarWhatsApp({ ...comum, mensagem: `${pdf.rotulo} — ${nomeDaEmpresa(empresa)}`, anexo: { filename: pdf.nome, base64: pdf.base64, mimetype: 'application/pdf' } });
            anota({ ok: true, texto: `${formatarTelefone(para)}: ${pdf.rotulo} enviado` });
            await esperar(1200);
          }
        } catch (e) { anota({ ok: false, texto: `${formatarTelefone(para)}: ${e.message}` }); }
      }
      toast({ title: 'Disparo concluído', description: 'Veja o resumo abaixo.' });
    } finally { setEnviando(false); }
  }, [selecionados, numeros, abertura, empresaId, empresa, minhaEmpresa, toast]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isSuperAdmin) return <p className="text-sm text-muted-foreground py-10 text-center">Esta tela é só para o superadmin.</p>;

  const Linha = ({ k, titulo, children }) => (
    <div className={`rounded-md border p-3 ${marcados[k] ? 'border-emerald-400 bg-emerald-50/40' : ''}`}>
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><Checkbox checked={!!marcados[k]} onCheckedChange={marca(k)} />{titulo}</label>
      {marcados[k] && <div className="mt-2 flex flex-wrap items-end gap-3 pl-6">{children}</div>}
    </div>
  );
  const Campo = ({ r, children }) => <div><Label className="text-xs">{r}</Label>{children}</div>;
  const dataInput = (k) => <Input type="date" className="h-9 w-40" value={p[k]} onChange={(e) => set(k)(e.target.value)} />;

  return (
    <>
      <Helmet><title>Disparo de Resultados - Engagement ERP</title></Helmet>
      <PageHeader title="Disparo de Resultados" icon={Send} description="Escolha uma empresa, marque os relatórios e envie por WhatsApp para qualquer número. Sai sempre pelo seu WhatsApp (o da sua empresa)." />

      <div className={`mb-4 rounded-md border px-3 py-2 text-sm flex flex-wrap items-center gap-2 ${conectado ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
        <MessageCircle className="h-4 w-4" />
        <span>Enviar pelo WhatsApp de:</span>
        <select className={`${sel} bg-white`} value={minhaEmpresa} onChange={(e) => setMinhaEmpresa(e.target.value)}>
          {remetentes.length === 0 && <option value="">Nenhum WhatsApp conectado no sistema</option>}
          {remetentes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
        <span>{conectado === null ? 'conferindo…' : conectado ? '· conectado, os envios saem por ele.' : '· desconectado. Conecte em Configurações > WhatsApp antes de enviar.'}</span>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">1. Empresa</CardTitle><CardDescription>Os dados dos relatórios são desta empresa.</CardDescription></CardHeader>
        <CardContent>
          <select className={`${sel} w-full max-w-xl`} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Escolha a empresa…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{nomeDaEmpresa(e)}{e.tipo_pessoa === 'PF' ? ' (pessoa física)' : ''}</option>)}
          </select>
        </CardContent>
      </Card>

      {empresaId && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">2. Relatórios</CardTitle><CardDescription>Marque quantos quiser. Cada um vai como um PDF.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {carregandoEmpresa && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando dados da empresa…</div>}
              <Linha k="mensal" titulo="Relatório mensal (DRE, ponto de equilíbrio e indicadores)">
                <Campo r="Mês"><select className={sel} value={p.mes} onChange={(e) => set('mes')(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Campo>
                <Campo r="Ano"><Input type="number" className="h-9 w-24" value={p.ano} onChange={(e) => set('ano')(e.target.value)} /></Campo>
              </Linha>
              <Linha k="pagar" titulo="Contas a pagar">
                <Campo r="Vencimento de">{dataInput('pagarDe')}</Campo><Campo r="até">{dataInput('pagarAte')}</Campo>
                <label className="flex items-center gap-2 text-sm pb-1"><Checkbox checked={p.pagarAberto} onCheckedChange={(v) => set('pagarAberto')(v === true)} />Só em aberto</label>
              </Linha>
              <Linha k="receber" titulo="Contas a receber">
                <Campo r="Vencimento de">{dataInput('receberDe')}</Campo><Campo r="até">{dataInput('receberAte')}</Campo>
                <label className="flex items-center gap-2 text-sm pb-1"><Checkbox checked={p.receberAberto} onCheckedChange={(v) => set('receberAberto')(v === true)} />Só em aberto</label>
              </Linha>
              <Linha k="obra" titulo="Prestação de contas da obra">
                <Campo r="Obra"><select className={`${sel} w-64`} value={p.obraId} onChange={(e) => set('obraId')(e.target.value)}><option value="TODOS">Todas as obras</option>{obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</option>)}</select></Campo>
                <Campo r="De (opcional)">{dataInput('obraDe')}</Campo><Campo r="Até (opcional)">{dataInput('obraAte')}</Campo>
              </Linha>
              <Linha k="extrato" titulo="Extrato conciliado">
                <Campo r="Banco"><select className={`${sel} w-64`} value={p.bancoId} onChange={(e) => set('bancoId')(e.target.value)}><option value="TODOS">Todos os bancos</option>{bancos.map((b) => <option key={b.id} value={b.id}>{b.nome}{b.conta ? ` · cc ${b.conta}` : ''}</option>)}</select></Campo>
                <Campo r="De">{dataInput('extratoDe')}</Campo><Campo r="Até">{dataInput('extratoAte')}</Campo>
              </Linha>
              <Linha k="pedido" titulo="Pedido de compra">
                <Campo r="Pedido"><select className={`${sel} w-80`} value={p.pedidoId} onChange={(e) => set('pedidoId')(e.target.value)}><option value="">Escolha…</option>{pedidos.map((x) => <option key={x.id} value={x.id}>{x.numero || x.id.slice(0, 6)} · {x.fornecedor?.nome || 'sem fornecedor'} · {moeda(x.valor_total)}{x.data_pedido ? ` · ${dataBR(x.data_pedido)}` : ''}</option>)}</select></Campo>
                {pedidos.length === 0 && <span className="text-xs text-muted-foreground pb-2">Esta empresa não tem pedidos de compra.</span>}
              </Linha>
              <Linha k="proposta" titulo="Proposta comercial">
                <Campo r="Proposta"><select className={`${sel} w-80`} value={p.propostaId} onChange={(e) => set('propostaId')(e.target.value)}><option value="">Escolha…</option>{propostas.map((x) => <option key={x.id} value={x.id}>{x.numero || 'Rascunho'} · {x.titulo}{x.conta?.nome ? ` · ${x.conta.nome}` : ''}</option>)}</select></Campo>
                {propostas.length === 0 && <span className="text-xs text-muted-foreground pb-2">Esta empresa não tem propostas.</span>}
              </Linha>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">3. Para quem enviar</CardTitle><CardDescription>Um ou vários números, um por linha (com DDD). Todos recebem os mesmos relatórios.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={3} value={destinos} onChange={(e) => setDestinos(e.target.value)} placeholder={'(19) 99999-9999\n(11) 98888-7777'} />
              {invalidos.length > 0 && <p className="text-xs text-red-600">Telefone inválido: {invalidos.join(', ')}</p>}
              <div><Label className="text-xs">Mensagem de abertura (opcional; vai antes dos PDFs)</Label><Textarea rows={2} value={abertura} onChange={(e) => setAbertura(e.target.value)} /></div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground">{selecionados.length} relatório(s) × {numeros.length} número(s) = {selecionados.length * numeros.length} arquivo(s) para enviar{abertura.trim() ? ' + a abertura' : ''}.</span>
                <Button onClick={enviar} disabled={!podeEnviar} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar</Button>
              </div>
            </CardContent>
          </Card>

          {resultado.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {resultado.map((r, i) => <div key={i} className={`flex items-start gap-2 ${r.ok ? 'text-foreground' : 'text-red-600'}`}>{r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}<span>{r.texto}</span></div>)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
};

export default DisparoResultados;
