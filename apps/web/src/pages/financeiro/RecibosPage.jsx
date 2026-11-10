import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, Loader2, MessageCircle, Printer, Receipt, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { dadosDaEmpresa, listarBaixasComRecibo, emitirRecibo, pdfDoRecibo, excluirRecibo, referentePadrao } from '@/lib/recibos';
import { imprimirPdfBase64 } from '@/lib/pdfSaida';

const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dia = (iso) => String(iso || '').slice(0, 10).split('-').reverse().join('/');
const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const hojeISO = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => `${hojeISO().slice(0, 8)}01`;

// Recibos: lista as baixas (pagamentos e recebimentos) e permite emitir, reimprimir e enviar por WhatsApp o recibo de cada uma.
const RecibosPage = () => {
  const { toast } = useToast();
  const { company_id: companyId, role, loading: authLoading } = useAuthContext();
  const [de, setDe] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().slice(0, 10); });
  const [ate, setAte] = useState(hojeISO());
  const [tipo, setTipo] = useState('pagar');
  const [situacao, setSituacao] = useState('TODAS');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [baixas, setBaixas] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [emitindo, setEmitindo] = useState(null); // { baixa, referente }
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState(null); // { base64, nome, titulo }
  const [zap, setZap] = useState(null); // { recibo, telefone }

  const carregar = useCallback(async () => {
    if (!companyId) return;
    setCarregando(true);
    try {
      const [emp, r] = await Promise.all([dadosDaEmpresa(companyId), listarBaixasComRecibo(companyId, { de, ate })]);
      setEmpresa(emp); setBaixas(r.baixas);
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setCarregando(false); }
  }, [companyId, de, ate, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return baixas.filter((b) => {
      const m = b.movimentacao;
      const t = String(m.tipo || '').toLowerCase() === 'receber' ? 'receber' : 'pagar';
      if (tipo !== 'todos' && t !== tipo) return false;
      if (situacao === 'SEM' && b.recibos.length) return false;
      if (situacao === 'COM' && !b.recibos.length) return false;
      const pessoa = (t === 'receber' ? m.cliente?.nome : m.fornecedor?.nome) || '';
      return !q || pessoa.toLowerCase().includes(q) || String(m.numero_titulo || '').toLowerCase().includes(q) || b.recibos.some((r) => String(r.numero) === q);
    });
  }, [baixas, tipo, situacao, busca]);

  const total = lista.reduce((s, b) => s + (Number(b.valor_baixa) || 0), 0);

  const abrirEmissao = (baixa) => setEmitindo({ baixa, referente: referentePadrao(baixa.movimentacao) });
  const confirmarEmissao = async () => {
    if (!emitindo?.referente?.trim()) { toast({ title: 'Informe o "referente a"', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const r = await emitirRecibo({ companyId, baixa: emitindo.baixa, empresa, referente: emitindo.referente });
      const pdf = await pdfDoRecibo(r);
      setEmitindo(null);
      setPrevia({ base64: pdf.base64, nome: pdf.nome, titulo: `Recibo nº ${r.numero}` });
      toast({ title: `Recibo nº ${r.numero} emitido`, description: `${r.recebedor_nome} · ${brl(r.valor)}` });
      carregar();
    } catch (e) { toast({ title: 'Não foi possível emitir o recibo', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };
  const ver = async (r, imprimir = false) => {
    try {
      const pdf = await pdfDoRecibo(r);
      if (imprimir) imprimirPdfBase64(pdf.base64); else setPrevia({ base64: pdf.base64, nome: pdf.nome, titulo: `Recibo nº ${r.numero}` });
    } catch (e) { toast({ title: 'Não foi possível abrir o recibo', description: e.message, variant: 'destructive' }); }
  };
  const apagar = async (r) => {
    if (!window.confirm(`Excluir o recibo nº ${r.numero}? O número não é reaproveitado.`)) return;
    try { await excluirRecibo(r.id); toast({ title: 'Recibo excluído' }); carregar(); }
    catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Selecione uma empresa para ver os recibos.</p>;
  const podeExcluir = role === 'admin' || role === 'superadmin';

  return (
    <>
      <Helmet><title>Recibos - Engagement ERP</title></Helmet>
      <PageHeader title="Recibos" icon={Receipt} description="Emita o recibo de cada pagamento ou recebimento já baixado, reimprima quando precisar e envie por WhatsApp. Os recibos são numerados por empresa." />

      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 h-9 w-64" placeholder="Pessoa, título ou nº do recibo" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="pagar">Pagamentos (fornecedores)</option><option value="receber">Recebimentos (clientes)</option><option value="todos">Todos</option></select>
        <select className={sel} value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="TODAS">Com e sem recibo</option><option value="SEM">Sem recibo</option><option value="COM">Com recibo</option></select>
        <div className="flex items-center gap-1"><Input type="date" className="h-9 w-[140px]" value={de} onChange={(e) => setDe(e.target.value)} /><span className="text-muted-foreground text-sm">até</span><Input type="date" className="h-9 w-[140px]" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      </div>

      {!carregando && lista.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-6 rounded-md border bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">{lista.length} baixa(s)</span>
          <span>Total: <strong>{brl(total)}</strong></span>
          <span className="text-muted-foreground">{lista.filter((b) => b.recibos.length).length} com recibo · {lista.filter((b) => !b.recibos.length).length} sem recibo</span>
        </div>
      )}

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr>
            {['Data da baixa', 'Pessoa', 'Título', 'Valor', 'Recibo', ''].map((h) => <th key={h || 'acoes'} className={`px-3 py-2 font-medium ${h === 'Valor' ? 'text-right' : ''}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="px-3 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>}
            {!carregando && lista.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Nenhuma baixa neste filtro.</td></tr>}
            {!carregando && lista.map((b) => {
              const m = b.movimentacao; const pagar = String(m.tipo || '').toLowerCase() !== 'receber';
              const pessoa = (pagar ? m.fornecedor?.nome : m.cliente?.nome) || '—';
              return (
                <tr key={b.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{dia(b.data_baixa)}</td>
                  <td className="px-3 py-2 min-w-[200px]">{pessoa}<div className="text-[11px] text-muted-foreground">{pagar ? 'pagamento' : 'recebimento'}</div></td>
                  <td className="px-3 py-2 text-xs font-mono max-w-[260px]">{m.numero_titulo}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{brl(b.valor_baixa)}</td>
                  <td className="px-3 py-2">
                    {b.recibos.length === 0 ? <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => abrirEmissao(b)}><Receipt className="h-3.5 w-3.5" />Emitir recibo</Button> : b.recibos.map((r) => (
                      <div key={r.id} className="flex items-center gap-1 mb-1">
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10">Nº {r.numero}</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver o recibo" onClick={() => ver(r)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Imprimir" onClick={() => ver(r, true)}><Printer className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Enviar por WhatsApp" onClick={() => setZap({ recibo: r, telefone: (pagar ? m.fornecedor?.telefone : '') || '' })}><MessageCircle className="h-4 w-4 text-emerald-600" /></Button>
                        {podeExcluir && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir o recibo" onClick={() => apagar(r)}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!emitindo} onOpenChange={(o) => { if (!o) setEmitindo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir recibo</DialogTitle>
            <DialogDescription>{emitindo ? `${(String(emitindo.baixa.movimentacao.tipo).toLowerCase() === 'receber' ? emitindo.baixa.movimentacao.cliente?.nome : emitindo.baixa.movimentacao.fornecedor?.nome) || 'Sem nome'} · ${brl(emitindo.baixa.valor_baixa)} · baixa de ${dia(emitindo.baixa.data_baixa)}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Referente a</Label>
            <Textarea rows={3} value={emitindo?.referente || ''} onChange={(e) => setEmitindo((s) => ({ ...s, referente: e.target.value }))} placeholder="Ex.: duas diárias de serviços prestados" />
            <p className="text-xs text-muted-foreground">O recibo recebe o próximo número da empresa e sai com o valor por extenso, a data da baixa e a linha de assinatura.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitindo(null)} disabled={salvando}>Cancelar</Button>
            <Button onClick={confirmarEmissao} disabled={salvando}>{salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}Emitir e abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviaPdfDialog open={!!previa} onOpenChange={(o) => { if (!o) setPrevia(null); }} titulo={previa?.titulo || 'Recibo'} nome={previa?.nome || 'recibo.pdf'} base64={previa?.base64} />

      {zap && (
        <EnviarWhatsAppDialog
          open onOpenChange={(o) => { if (!o) setZap(null); }}
          titulo={`Enviar o recibo nº ${zap.recibo.numero}`} descricao={`${zap.recibo.recebedor_nome} · ${brl(zap.recibo.valor)}`}
          tipo="outro" refTipo="recibo" refId={zap.recibo.id}
          paraInicial={zap.telefone}
          mensagemInicial={`Olá! Segue o recibo nº ${zap.recibo.numero} de ${brl(zap.recibo.valor)}, referente a ${zap.recibo.referente}, de ${dia(zap.recibo.data)}.`}
          anexos={[{ rotulo: `Recibo nº ${zap.recibo.numero} em PDF`, gerar: () => pdfDoRecibo(zap.recibo) }]}
        />
      )}
    </>
  );
};

export default RecibosPage;
