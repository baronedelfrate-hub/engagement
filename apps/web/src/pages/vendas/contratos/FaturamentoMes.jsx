import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Receipt, RefreshCw, Mail, MessageCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EnviarEmailDialog from '@/components/EnviarEmailDialog';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { moeda, hojeISO } from '@/lib/crmService';
import { listarContratos, competenciasDevidas } from '@/lib/crmContratos';
import { gerarPedidoDaCompetencia } from '@/lib/crmFaturamento';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
const chave = (c, comp) => `${c.id}|${comp.competencia}`;

// "Faturamento do mês": os pedidos de venda dos contratos recorrentes são gerados aqui, por clique, depois de conferir.
const FaturamentoMes = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [pedidos, setPedidos] = useState({});
  const [emailsClientes, setEmailsClientes] = useState({});
  const [avisar, setAvisar] = useState(null);
  const [avisarZap, setAvisarZap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [sel, setSel] = useState({});
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const lista = await listarContratos(companyId);
      setContratos(lista);
      const ids = lista.flatMap((c) => c.faturamentos.map((f) => f.pedido_venda_id)).filter(Boolean);
      if (ids.length) {
        const { data } = await supabase.from('pedidos_venda').select('id, numero, valor_total, data_vencimento').in('id', ids);
        setPedidos(Object.fromEntries((data || []).map((p) => [p.id, p])));
      }
      const cids = [...new Set(lista.map((c) => c.cliente_id).filter(Boolean))];
      if (cids.length) {
        const { data } = await supabase.from('clientes').select('id, nome, email, telefone').in('id', cids);
        setEmailsClientes(Object.fromEntries((data || []).map((x) => [x.id, x])));
      }
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const pendentes = useMemo(() => contratos.flatMap((c) => {
    const faturadas = new Set(c.faturamentos.map((f) => String(f.competencia).slice(0, 10)));
    return competenciasDevidas(c, c.itens, faturadas, hoje).map((comp) => ({ c, comp }));
  }).sort((a, b) => a.comp.competencia.localeCompare(b.comp.competencia) || a.c.numero.localeCompare(b.c.numero)), [contratos, hoje]);

  useEffect(() => {
    setSel((atual) => {
      const novo = {};
      pendentes.forEach(({ c, comp }) => { const k = chave(c, comp); novo[k] = k in atual ? atual[k] : comp.noPrazo; });
      return novo;
    });
  }, [pendentes]);

  const marcados = pendentes.filter(({ c, comp }) => sel[chave(c, comp)]);
  const totalMarcado = marcados.reduce((s, { comp }) => s + comp.valor, 0);

  const gerar = async () => {
    if (!marcados.length) return;
    setGerando(true);
    let feitos = 0; const falhas = [];
    for (const { c, comp } of marcados) {
      try { await gerarPedidoDaCompetencia({ companyId, contrato: c, competencia: comp }); feitos += 1; }
      catch (e) { falhas.push(`${c.numero} ${comp.rotulo}: ${e.message}`); }
    }
    setGerando(false);
    toast({ title: `${feitos} pedido(s) gerado(s)`, description: falhas.length ? `Não geraram: ${falhas.join(' | ')}` : 'Prontos para emitir as notas em Fiscal.', variant: falhas.length ? 'destructive' : undefined });
    await carregar();
  };

  const recentes = contratos.flatMap((c) => c.faturamentos.filter((f) => f.pedido_venda_id).map((f) => ({ c, f }))).sort((a, b) => String(b.f.created_at || b.f.competencia).localeCompare(String(a.f.created_at || a.f.competencia))).slice(0, 15);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o faturamento dela.</p>;

  return (
    <>
      <Helmet><title>Faturamento do mês</title></Helmet>
      <PageHeader
        title="Faturamento do mês"
        description="Competências já encerradas que ainda não geraram pedido de venda. A cobrança é no mês seguinte, no dia combinado em cada contrato."
        action={<div className="flex gap-2"><Button variant="ghost" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button><Button variant="outline" size="sm" onClick={() => navigate('/vendas/contratos')}><ArrowLeft className="w-4 h-4 mr-2" /> Contratos</Button></div>}
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><CardTitle className="text-base">A faturar</CardTitle><CardDescription>{pendentes.length} competência(s) · {marcados.length} marcada(s) · {moeda(totalMarcado)}. As que ainda não chegaram ao dia de faturamento vêm desmarcadas.</CardDescription></div>
            <Button onClick={gerar} disabled={gerando || !marcados.length}>{gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}Gerar pedidos do mês ({marcados.length})</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nada a faturar. Todas as competências encerradas já têm pedido.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-2 w-8" /><th className="text-left p-2">Contrato</th><th className="text-left p-2">Cliente</th><th className="text-left p-2">Competência</th><th className="text-right p-2">Valor</th><th className="text-left p-2">Faturar em</th><th className="text-left p-2">Vencimento</th></tr></thead>
              <tbody className="divide-y divide-border">
                {pendentes.map(({ c, comp }) => {
                  const k = chave(c, comp);
                  return (
                    <tr key={k}>
                      <td className="p-2"><Checkbox checked={!!sel[k]} onCheckedChange={(v) => setSel((s) => ({ ...s, [k]: v === true }))} /></td>
                      <td className="p-2"><button type="button" className="font-medium hover:underline" onClick={() => navigate(`/vendas/contratos/${c.id}`)}>{c.numero}</button></td>
                      <td className="p-2">{c.cliente?.nome}</td>
                      <td className="p-2">{comp.rotulo}{comp.proporcional && <Badge variant="outline" className="ml-2">{comp.dias}/{comp.diasMes} dias</Badge>}</td>
                      <td className="p-2 text-right font-medium">{moeda(comp.valor)}</td>
                      <td className="p-2 text-xs">{fmt(comp.faturamento)}{!comp.noPrazo && <span className="text-muted-foreground"> (ainda não chegou)</span>}</td>
                      <td className="p-2 text-xs">{fmt(comp.vencimento)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pedidos gerados recentemente</CardTitle><CardDescription>Clique para abrir o pedido e emitir a nota.</CardDescription></CardHeader>
        <CardContent>
          {recentes.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido gerado ainda.</p> : (
            <div className="divide-y divide-border">
              {recentes.map(({ c, f }) => (
                <div key={f.contrato_id + f.competencia} className="py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/vendas/pedidos/${f.pedido_venda_id}`)}>
                  <span><span className="font-medium">{pedidos[f.pedido_venda_id]?.numero || 'pedido'}</span> <span className="text-muted-foreground">· {c.cliente?.nome} · competência {String(f.competencia).slice(5, 7)}/{String(f.competencia).slice(0, 4)}</span></span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{moeda(f.valor)}</span>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAvisar({ c, f }); }}><Mail className="w-3.5 h-3.5 mr-1.5" /> E-mail</Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAvisarZap({ c, f }); }}><MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> WhatsApp</Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {avisarZap && (
        <EnviarWhatsAppDialog
          open={!!avisarZap} onOpenChange={(o) => { if (!o) setAvisarZap(null); }}
          titulo="Avisar o cliente pelo WhatsApp" descricao={`${avisarZap.c.numero} · ${avisarZap.c.cliente?.nome || ''}`}
          tipo="aviso_faturamento" refTipo="pedido_venda" refId={avisarZap.f.pedido_venda_id}
          paraInicial={emailsClientes[avisarZap.c.cliente_id]?.telefone || ''}
          mensagemInicial={`Olá! Tudo bem?\n\nInformamos a cobrança de *${String(avisarZap.f.competencia).slice(5, 7)}/${String(avisarZap.f.competencia).slice(0, 4)}* do contrato "${avisarZap.c.titulo}":\n\nValor: *${moeda(avisarZap.f.valor)}*${pedidos[avisarZap.f.pedido_venda_id]?.data_vencimento ? `\nVencimento: *${fmt(pedidos[avisarZap.f.pedido_venda_id].data_vencimento)}*` : ''}\n\nA nota fiscal será enviada em seguida. Qualquer dúvida, é só responder por aqui. Obrigado!`}
        />
      )}

      {avisar && (
        <EnviarEmailDialog
          open={!!avisar} onOpenChange={(o) => { if (!o) setAvisar(null); }}
          titulo="Avisar o cliente da cobrança do mês" descricao={`${avisar.c.numero} · ${avisar.c.cliente?.nome || ''}`}
          tipo="aviso_faturamento" refTipo="pedido_venda" refId={avisar.f.pedido_venda_id}
          paraInicial={emailsClientes[avisar.c.cliente_id]?.email || ''}
          assuntoInicial={`Cobrança de ${String(avisar.f.competencia).slice(5, 7)}/${String(avisar.f.competencia).slice(0, 4)} — ${avisar.c.titulo}`}
          mensagemInicial={`Olá!\n\nInformamos o valor referente a ${String(avisar.f.competencia).slice(5, 7)}/${String(avisar.f.competencia).slice(0, 4)} do contrato "${avisar.c.titulo}"${pedidos[avisar.f.pedido_venda_id]?.data_vencimento ? `, com vencimento em ${fmt(pedidos[avisar.f.pedido_venda_id].data_vencimento)}` : ''}.\n\nA nota fiscal será enviada em seguida. Qualquer dúvida, é só responder este e-mail.\n\nObrigado!`}
          destaques={[
            { rotulo: 'Contrato', valor: avisar.c.numero },
            { rotulo: 'Competência', valor: `${String(avisar.f.competencia).slice(5, 7)}/${String(avisar.f.competencia).slice(0, 4)}` },
            { rotulo: 'Valor', valor: moeda(avisar.f.valor) },
            ...(pedidos[avisar.f.pedido_venda_id]?.data_vencimento ? [{ rotulo: 'Vencimento', valor: fmt(pedidos[avisar.f.pedido_venda_id].data_vencimento) }] : [])
          ]}
        />
      )}
    </>
  );
};

export default FaturamentoMes;
