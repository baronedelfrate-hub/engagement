import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, Loader2, MessageCircle, Send } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { statusWhatsApp } from '@/lib/whatsappService';
import { montarTextoPagamentos, listarChavesParaCopiar } from '@/lib/mensagemPagamentos';
import { mensagemRelatorioFinanceiro, blocoPagamentosDoRelatorio } from '@/lib/mensagemRelatorioFinanceiro';
import {
  listarEmpresas, nomeDaEmpresa, listarObras, listarBancos, listarPedidos, listarPropostasDaEmpresa,
  gerarMensal, gerarFinanceiro, gerarPrestacao, gerarExtrato, gerarPedido, gerarProposta, dataBR
} from '@/lib/disparoResultados';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const hoje = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Superadmin: gera cada relatório de QUALQUER empresa e envia, um a um, pelo WhatsApp conectado escolhido.
// Usa a mesma caixa de envio das telas das empresas (prévia fiel, valor e chave Pix no contas a pagar).
const DisparoResultados = () => {
  const { toast } = useToast();
  const { company_id: empresaDoContexto, isSuperAdmin, loading: authLoading } = useAuthContext();
  const [remetentes, setRemetentes] = useState([]);
  const [remetenteId, setRemetenteId] = useState('');
  const [conectado, setConectado] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [obras, setObras] = useState([]); const [bancos, setBancos] = useState([]); const [pedidos, setPedidos] = useState([]); const [propostas, setPropostas] = useState([]);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(false);
  const [p, setP] = useState({
    ano: hoje.getFullYear(), mes: hoje.getMonth() === 0 ? 0 : hoje.getMonth() - 1,
    pagarDe: iso(hoje), pagarAte: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)), pagarAberto: true,
    receberDe: iso(hoje), receberAte: iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)), receberAberto: true,
    obraId: 'TODOS', obraDe: '', obraAte: '', bancoId: 'TODOS', extratoDe: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), extratoAte: iso(hoje),
    pedidoId: '', propostaId: ''
  });
  const [trabalhando, setTrabalhando] = useState(''); // chave do relatório sendo gerado
  const [previa, setPrevia] = useState(null);
  const [envio, setEnvio] = useState(null); // { titulo, descricao, mensagem, bloco, pdf }
  const cachePdf = useRef(new Map());

  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const empresa = useMemo(() => empresas.find((e) => e.id === empresaId), [empresas, empresaId]);

  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    listarEmpresas().then(setEmpresas).catch((e) => toast({ title: 'Erro ao listar empresas', description: e.message, variant: 'destructive' }));
    supabase.from('whatsapp_instancias').select('company_id, empresa:empresas(razao_social, nome_fantasia)').then(({ data }) => {
      const lista = (data || []).map((r) => ({ id: r.company_id, nome: nomeDaEmpresa(r.empresa) }));
      setRemetentes(lista);
      setRemetenteId((atual) => atual || (lista.find((x) => x.id === empresaDoContexto) ? empresaDoContexto : (lista[0]?.id || '')));
    });
  }, [authLoading, isSuperAdmin, empresaDoContexto, toast]);

  useEffect(() => {
    if (!remetenteId) { setConectado(false); return; }
    setConectado(null);
    statusWhatsApp(remetenteId).then((s) => setConectado(!!s?.conectado)).catch(() => setConectado(false));
  }, [remetenteId]);

  useEffect(() => {
    if (!empresaId) return undefined;
    let vivo = true; setCarregandoEmpresa(true); cachePdf.current.clear();
    Promise.all([listarObras(empresaId), listarBancos(empresaId), listarPedidos(empresaId).catch(() => []), listarPropostasDaEmpresa(empresaId).catch(() => [])])
      .then(([o, b, pe, pr]) => { if (!vivo) return; setObras(o); setBancos(b); setPedidos(pe); setPropostas(pr); setP((x) => ({ ...x, obraId: 'TODOS', bancoId: 'TODOS', pedidoId: '', propostaId: '' })); })
      .catch((e) => toast({ title: 'Erro ao carregar a empresa', description: e.message, variant: 'destructive' }))
      .finally(() => vivo && setCarregandoEmpresa(false));
    return () => { vivo = false; };
  }, [empresaId, toast]);

  // cada relatório: como gerar e qual mensagem/bloco acompanham o envio
  const relatorios = useMemo(() => ({
    mensal: { titulo: 'Relatório mensal (DRE, ponto de equilíbrio e indicadores)', gerar: () => gerarMensal(empresaId, { ano: Number(p.ano), mes: Number(p.mes) }) },
    pagar: { titulo: 'Contas a pagar', gerar: () => gerarFinanceiro(empresaId, 'CONTAS_PAGAR', { de: p.pagarDe, ate: p.pagarAte, soEmAberto: p.pagarAberto }), financeiro: 'CONTAS_PAGAR' },
    receber: { titulo: 'Contas a receber', gerar: () => gerarFinanceiro(empresaId, 'CONTAS_RECEBER', { de: p.receberDe, ate: p.receberAte, soEmAberto: p.receberAberto }), financeiro: 'CONTAS_RECEBER' },
    obra: { titulo: 'Prestação de contas da obra', gerar: () => gerarPrestacao(empresaId, { obraId: p.obraId, de: p.obraDe, ate: p.obraAte }) },
    extrato: { titulo: 'Extrato conciliado', gerar: () => gerarExtrato(empresaId, { bancoId: p.bancoId, de: p.extratoDe, ate: p.extratoAte }) },
    pedido: { titulo: 'Pedido de compra', gerar: () => { if (!p.pedidoId) throw new Error('Escolha o pedido de compra.'); return gerarPedido(empresaId, p.pedidoId); } },
    proposta: { titulo: 'Proposta comercial', gerar: () => { if (!p.propostaId) throw new Error('Escolha a proposta.'); return gerarProposta(empresaId, p.propostaId); } }
  }), [empresaId, p]);

  const pdfDe = async (k) => {
    const ch = `${empresaId}|${k}|${JSON.stringify(p)}`;
    if (!cachePdf.current.has(ch)) cachePdf.current.set(ch, await relatorios[k].gerar());
    return cachePdf.current.get(ch);
  };
  const verPrevia = async (k) => {
    setTrabalhando(k);
    try { const r = await pdfDe(k); setPrevia({ titulo: relatorios[k].titulo, nome: r.nome, base64: r.base64 }); }
    catch (e) { toast({ title: 'Não foi possível gerar a prévia', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(''); }
  };
  const prepararEnvio = async (k) => {
    if (!remetenteId || conectado === false) { toast({ title: 'Escolha um WhatsApp conectado para enviar', variant: 'destructive' }); return; }
    setTrabalhando(k);
    try {
      const r = await pdfDe(k);
      const nomeEmpresa = nomeDaEmpresa(empresa);
      let mensagem = `Olá! Segue ${r.rotulo || relatorios[k].titulo} de ${nomeEmpresa}.`;
      let bloco = null;
      if (relatorios[k].financeiro) {
        mensagem = mensagemRelatorioFinanceiro({ source: relatorios[k].financeiro, periodo: r.periodo, linhas: r.linhas });
        if (relatorios[k].financeiro === 'CONTAS_PAGAR') bloco = blocoPagamentosDoRelatorio(montarTextoPagamentos(r.linhas), listarChavesParaCopiar(r.linhas));
      }
      setEnvio({ titulo: `Enviar ${relatorios[k].titulo.toLowerCase()} por WhatsApp`, descricao: `${nomeEmpresa}${r.periodo ? ` · vencimento ${r.periodo}` : ''}`, mensagem, bloco, pdf: r });
    } catch (e) { toast({ title: 'Não foi possível preparar o envio', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(''); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isSuperAdmin) return <p className="text-sm text-muted-foreground py-10 text-center">Esta tela é só para o superadmin.</p>;

  const Cartao = ({ k, children }) => (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium mb-2">{relatorios[k].titulo}</div>
      <div className="flex flex-wrap items-end gap-3">
        {children}
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1" disabled={!!trabalhando || carregandoEmpresa} onClick={() => verPrevia(k)}>
          {trabalhando === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}Ver prévia
        </Button>
        <Button type="button" size="sm" className="h-9 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!!trabalhando || carregandoEmpresa || !conectado} onClick={() => prepararEnvio(k)}>
          {trabalhando === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar por WhatsApp
        </Button>
      </div>
    </div>
  );
  const Campo = ({ r, children }) => <div><Label className="text-xs">{r}</Label>{children}</div>;
  const dataInput = (k) => <Input type="date" className="h-9 w-40" value={p[k]} onChange={(e) => set(k)(e.target.value)} />;

  return (
    <>
      <Helmet><title>Disparo de Resultados - Engagement ERP</title></Helmet>
      <PageHeader title="Disparo de Resultados" icon={Send} description="Escolha uma empresa e envie cada relatório, um por vez, por WhatsApp para qualquer número. A caixa de envio é a mesma das telas das empresas: prévia fiel e, no contas a pagar, valor e chave Pix." />

      <div className={`mb-4 rounded-md border px-3 py-2 text-sm flex flex-wrap items-center gap-2 ${conectado ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
        <MessageCircle className="h-4 w-4" />
        <span>Enviar pelo WhatsApp de:</span>
        <select className={`${sel} bg-white`} value={remetenteId} onChange={(e) => setRemetenteId(e.target.value)}>
          {remetentes.length === 0 && <option value="">Nenhum WhatsApp conectado no sistema</option>}
          {remetentes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
        <span>{conectado === null ? 'conferindo…' : conectado ? '· conectado, os envios saem por ele.' : '· desconectado. Conecte em Configurações > WhatsApp antes de enviar.'}</span>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Empresa dos dados</CardTitle><CardDescription>Os relatórios abaixo são desta empresa.</CardDescription></CardHeader>
        <CardContent>
          <select className={`${sel} w-full max-w-xl`} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Escolha a empresa…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{nomeDaEmpresa(e)}{e.tipo_pessoa === 'PF' ? ' (pessoa física)' : ''}</option>)}
          </select>
        </CardContent>
      </Card>

      {empresaId && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Relatórios</CardTitle><CardDescription>Ajuste o período, veja a prévia e envie. Cada relatório é enviado separadamente.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {carregandoEmpresa && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando dados da empresa…</div>}
            <Cartao k="pagar">
              <Campo r="Vencimento de">{dataInput('pagarDe')}</Campo><Campo r="até">{dataInput('pagarAte')}</Campo>
              <label className="flex items-center gap-2 text-sm pb-2"><Checkbox checked={p.pagarAberto} onCheckedChange={(v) => set('pagarAberto')(v === true)} />Só em aberto</label>
            </Cartao>
            <Cartao k="receber">
              <Campo r="Vencimento de">{dataInput('receberDe')}</Campo><Campo r="até">{dataInput('receberAte')}</Campo>
              <label className="flex items-center gap-2 text-sm pb-2"><Checkbox checked={p.receberAberto} onCheckedChange={(v) => set('receberAberto')(v === true)} />Só em aberto</label>
            </Cartao>
            <Cartao k="mensal">
              <Campo r="Mês"><select className={sel} value={p.mes} onChange={(e) => set('mes')(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Campo>
              <Campo r="Ano"><Input type="number" className="h-9 w-24" value={p.ano} onChange={(e) => set('ano')(e.target.value)} /></Campo>
            </Cartao>
            <Cartao k="obra">
              <Campo r="Obra"><select className={`${sel} w-64`} value={p.obraId} onChange={(e) => set('obraId')(e.target.value)}><option value="TODOS">Todas as obras</option>{obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</option>)}</select></Campo>
              <Campo r="De (opcional)">{dataInput('obraDe')}</Campo><Campo r="Até (opcional)">{dataInput('obraAte')}</Campo>
            </Cartao>
            <Cartao k="extrato">
              <Campo r="Banco"><select className={`${sel} w-64`} value={p.bancoId} onChange={(e) => set('bancoId')(e.target.value)}><option value="TODOS">Todos os bancos</option>{bancos.map((b) => <option key={b.id} value={b.id}>{b.nome}{b.conta ? ` · cc ${b.conta}` : ''}</option>)}</select></Campo>
              <Campo r="De">{dataInput('extratoDe')}</Campo><Campo r="Até">{dataInput('extratoAte')}</Campo>
            </Cartao>
            <Cartao k="pedido">
              <Campo r="Pedido"><select className={`${sel} w-80`} value={p.pedidoId} onChange={(e) => set('pedidoId')(e.target.value)}><option value="">Escolha…</option>{pedidos.map((x) => <option key={x.id} value={x.id}>{x.numero || x.id.slice(0, 6)} · {x.fornecedor?.nome || 'sem fornecedor'} · {moeda(x.valor_total)}{x.data_pedido ? ` · ${dataBR(x.data_pedido)}` : ''}</option>)}</select></Campo>
              {pedidos.length === 0 && <span className="text-xs text-muted-foreground pb-2">Esta empresa não tem pedidos de compra.</span>}
            </Cartao>
            <Cartao k="proposta">
              <Campo r="Proposta"><select className={`${sel} w-80`} value={p.propostaId} onChange={(e) => set('propostaId')(e.target.value)}><option value="">Escolha…</option>{propostas.map((x) => <option key={x.id} value={x.id}>{x.numero || 'Rascunho'} · {x.titulo}{x.conta?.nome ? ` · ${x.conta.nome}` : ''}</option>)}</select></Campo>
              {propostas.length === 0 && <span className="text-xs text-muted-foreground pb-2">Esta empresa não tem propostas.</span>}
            </Cartao>
          </CardContent>
        </Card>
      )}

      {envio && (
        <EnviarWhatsAppDialog
          open onOpenChange={(o) => { if (!o) setEnvio(null); }}
          titulo={envio.titulo} descricao={envio.descricao}
          tipo="outro" refTipo="disparo_resultados" refId={empresaId} empresaRemetente={remetenteId}
          mensagemInicial={envio.mensagem} blocoExtra={envio.bloco}
          anexos={[{ rotulo: 'Relatório em PDF', gerar: async () => envio.pdf }]}
        />
      )}
      <PreviaPdfDialog open={!!previa} onOpenChange={(o) => { if (!o) setPrevia(null); }} titulo={previa?.titulo} nome={previa?.nome} base64={previa?.base64} />
    </>
  );
};

export default DisparoResultados;
