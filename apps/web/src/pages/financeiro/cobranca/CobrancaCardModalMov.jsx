import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, MessageCircle, Copy, Wallet, PauseCircle, PlayCircle, Loader2, CalendarCheck, Send } from 'lucide-react';
import { enviarEmail } from '@/lib/emailService';
import { PHASES, formatCurrency } from '@/lib/cobrancaService';
import { registrarAcao, mensagemSugerida, linkWhatsApp, linkEmail, tituloDaMensagem } from '@/lib/cobrancaMovService';
import { formatDateOnly } from '@/lib/dateUtils';

const ROTULO_TIPO = { contato: 'Contato', promessa: 'Promessa de pagamento', negociacao: 'Negociação', observacao: 'Observação', suspensao: 'Cobrança suspensa', retomada: 'Cobrança retomada' };
const ROTULO_CANAL = { telefone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', presencial: 'Presencial', outro: 'Outro' };
const hoje = () => new Date().toISOString().split('T')[0];

const CobrancaCardModalMov = ({ isOpen, onClose, card, empresaNome, onChanged, onRegistrarRecebimento }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [form, setForm] = useState({ tipo: 'contato', canal: 'telefone', descricao: '', dataPromessa: '', valorPrometido: '' });

  // texto sugerido pela fase; recalcula só quando troca de título ou de fase
  useEffect(() => { if (card) setMensagem(mensagemSugerida(card, empresaNome)); }, [card?.id, card?.fase, empresaNome]);
  useEffect(() => {
    if (card) setForm({ tipo: 'contato', canal: 'telefone', descricao: '', dataPromessa: '', valorPrometido: String(card.saldo || '') });
  }, [card?.id]);

  const dias = card?.dias_ate_vencimento ?? 0;
  const prazoCor = card?.recuperado ? 'bg-emerald-500/10 text-emerald-600' : dias >= 3 ? 'bg-emerald-500/10 text-emerald-600' : dias >= 0 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600';
  const aberto = card && !card.recuperado;
  const temCanalTexto = ['contato', 'negociacao'].includes(form.tipo);
  const temTelefone = !!(card?.cliente?.telefone || '').replace(/\D/g, '');
  const temEmail = !!card?.cliente?.email;

  const gravar = async (dados, aviso) => {
    setSaving(true);
    try {
      await registrarAcao({ companyId: card.company_id, movimentacaoId: card.id, ...dados });
      if (aviso) toast({ title: aviso });
      if (onChanged) await onChanged();
      return true;
    } catch (e) {
      toast({ title: 'Erro ao registrar', description: e.message || 'Tente novamente.', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const registrarDoFormulario = async () => {
    if (form.tipo === 'promessa' && !form.dataPromessa) return toast({ title: 'Atenção', description: 'Informe a data prometida para o pagamento.', variant: 'destructive' });
    if (form.tipo !== 'promessa' && !form.descricao.trim()) return toast({ title: 'Atenção', description: 'Escreva o que foi tratado.', variant: 'destructive' });
    const ok = await gravar({
      tipo: form.tipo,
      canal: temCanalTexto ? form.canal : null,
      descricao: form.descricao,
      dataPromessa: form.tipo === 'promessa' ? form.dataPromessa : null,
      valorPrometido: form.tipo === 'promessa' ? form.valorPrometido : null
    }, 'Registrado no histórico');
    if (ok) setForm((f) => ({ ...f, descricao: '', dataPromessa: '' }));
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      toast({ title: 'Mensagem copiada' });
    } catch {
      toast({ title: 'Não foi possível copiar', description: 'Selecione o texto e copie manualmente.', variant: 'destructive' });
    }
  };

  const enviarPor = async (canal) => {
    if (canal === 'whatsapp') window.open(linkWhatsApp(card.cliente?.telefone, mensagem), '_blank', 'noopener');
    else window.location.href = linkEmail(card.cliente?.email, tituloDaMensagem(card), mensagem);
    await gravar({ tipo: 'contato', canal, descricao: `Mensagem preparada para envio (${PHASES[card.fase]?.label || card.fase})` }, 'Contato registrado no histórico');
  };

  // Envio direto pelo Resend (sai em nome da empresa, resposta volta para quem enviou) e registro automático no histórico.
  const enviarEmailAgora = async () => {
    const destino = card.cliente?.email;
    if (!destino) return;
    if (!window.confirm(`Enviar este e-mail de cobrança para ${destino}?`)) return;
    setSaving(true);
    try {
      await enviarEmail({
        tipo: 'cobranca', para: [destino], assunto: tituloDaMensagem(card), mensagem,
        destaques: [
          { rotulo: 'Título', valor: card.numero_titulo },
          { rotulo: 'Valor em aberto', valor: formatCurrency(card.saldo) },
          { rotulo: 'Vencimento', valor: formatDateOnly(card.data_vencimento) },
          ...(dias < 0 ? [{ rotulo: 'Dias de atraso', valor: String(card.dias_atraso) }] : [])
        ],
        ref_tipo: 'movimentacao', ref_id: card.id
      });
      await registrarAcao({ companyId: card.company_id, movimentacaoId: card.id, tipo: 'contato', canal: 'email', descricao: `E-mail enviado para ${destino} (${PHASES[card.fase]?.label || card.fase})` });
      toast({ title: 'E-mail de cobrança enviado', description: `Para ${destino}. Registrado no histórico.` });
      if (onChanged) await onChanged();
    } catch (e) {
      toast({ title: 'Não foi possível enviar o e-mail', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const suspenderOuRetomar = async () => {
    await gravar({ tipo: card.suspensa ? 'retomada' : 'suspensao', descricao: form.descricao || null }, card.suspensa ? 'Cobrança retomada' : 'Cobrança suspensa');
  };

  const historico = useMemo(() => card?.acoes || [], [card]);

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xl font-bold">{card.cliente?.nome || 'Sem cliente'}</span>
              <span className="text-xs text-muted-foreground font-mono mt-1">Título: {card.numero_titulo}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              {!card.recuperado && (
                <Badge variant="outline" className={`${prazoCor} border-0`}>{dias < 0 ? `${card.dias_atraso} dias de atraso` : `${dias} dias de prazo`}</Badge>
              )}
              <Badge className="bg-muted text-muted-foreground">{PHASES[card.fase]?.label || card.fase}</Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {card.recuperado
              ? `Recebido ${card.pago_em ? `em ${formatDateOnly(card.pago_em)}` : ''} · ${formatCurrency(card.valor_recebido)}${card.dias_para_receber != null ? ` · ${card.dias_para_receber} dias após o vencimento` : ''}`
              : `Em aberto ${formatCurrency(card.saldo)} de ${formatCurrency(card.valor_total)} · vencimento ${formatDateOnly(card.data_vencimento)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Contato</div>
            {card.cliente?.telefone ? <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {card.cliente.telefone}</div> : <div className="text-muted-foreground">Sem telefone no cadastro</div>}
            {card.cliente?.email ? <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {card.cliente.email}</div> : <div className="text-muted-foreground">Sem e-mail no cadastro</div>}
          </div>
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Classificação</div>
            <div className="flex flex-wrap gap-1.5">
              {card.categoria?.nome && <Badge variant="secondary">{card.categoria.nome}</Badge>}
              {card.subcategoria?.nome && <Badge variant="secondary">{card.subcategoria.nome}</Badge>}
              {card.centro_custo?.nome && <Badge variant="secondary">{card.centro_custo.nome}</Badge>}
              {!card.categoria?.nome && !card.subcategoria?.nome && !card.centro_custo?.nome && <span className="text-muted-foreground">Sem classificação</span>}
            </div>
            {card.banco?.nome && <div className="text-xs text-muted-foreground">Banco: {card.banco.nome}</div>}
          </div>
        </div>

        {(card.promessa || card.suspensa) && aberto && (
          <div className="flex flex-wrap gap-2">
            {card.promessa && (
              <Badge variant="outline" className={`gap-1 ${card.promessa.vencida ? 'border-red-500/40 text-red-600' : 'border-blue-500/40 text-blue-600'}`}>
                <CalendarCheck className="h-3.5 w-3.5" /> Promessa de pagamento para {formatDateOnly(card.promessa.data)}{card.promessa.valor ? ` (${formatCurrency(card.promessa.valor)})` : ''}{card.promessa.vencida ? ' — vencida' : ''}
              </Badge>
            )}
            {card.suspensa && <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600"><PauseCircle className="h-3.5 w-3.5" /> Cobrança suspensa</Badge>}
          </div>
        )}

        {aberto && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Mensagem sugerida para esta fase</h3>
              <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="text-sm" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copiar}><Copy className="mr-2 h-3.5 w-3.5" /> Copiar</Button>
                <Button size="sm" variant="outline" disabled={!temTelefone || saving} onClick={() => enviarPor('whatsapp')} title={temTelefone ? '' : 'Cliente sem telefone no cadastro'}>
                  <MessageCircle className="mr-2 h-3.5 w-3.5" /> Abrir no WhatsApp
                </Button>
                <Button size="sm" disabled={!temEmail || saving} onClick={enviarEmailAgora} title={temEmail ? '' : 'Cliente sem e-mail no cadastro'}>
                  <Send className="mr-2 h-3.5 w-3.5" /> Enviar e-mail agora
                </Button>
                <Button size="sm" variant="outline" disabled={!temEmail || saving} onClick={() => enviarPor('email')} title={temEmail ? '' : 'Cliente sem e-mail no cadastro'}>
                  <Mail className="mr-2 h-3.5 w-3.5" /> Abrir no meu e-mail
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">"Enviar e-mail agora" manda a mensagem acima direto ao cliente, pela plataforma, e registra no histórico. WhatsApp e "meu e-mail" abrem o aplicativo com o texto pronto.</p>
            </div>

            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Registrar no histórico</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">O que aconteceu</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contato">Contato realizado</SelectItem>
                      <SelectItem value="negociacao">Negociação</SelectItem>
                      <SelectItem value="promessa">Promessa de pagamento</SelectItem>
                      <SelectItem value="observacao">Observação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {temCanalTexto && (
                  <div className="space-y-1">
                    <Label className="text-xs">Canal</Label>
                    <Select value={form.canal} onValueChange={(v) => setForm((f) => ({ ...f, canal: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ROTULO_CANAL).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {form.tipo === 'promessa' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Data prometida *</Label>
                      <Input type="date" min={hoje()} value={form.dataPromessa} onChange={(e) => setForm((f) => ({ ...f, dataPromessa: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor prometido (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={form.valorPrometido} onChange={(e) => setForm((f) => ({ ...f, valorPrometido: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>
              <Textarea rows={2} placeholder={form.tipo === 'promessa' ? 'Observação sobre a promessa (opcional)' : 'Descreva o que foi tratado...'} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={registrarDoFormulario} disabled={saving}>{saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Registrar</Button>
                <Button size="sm" variant="ghost" onClick={suspenderOuRetomar} disabled={saving} className="text-amber-700">
                  {card.suspensa ? <><PlayCircle className="mr-2 h-3.5 w-3.5" /> Retomar cobrança</> : <><PauseCircle className="mr-2 h-3.5 w-3.5" /> Suspender cobrança</>}
                </Button>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Histórico ({historico.length})</h3>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-y-auto">
              {historico.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-2 text-sm">
                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">{ROTULO_TIPO[a.tipo] || a.tipo}</strong>{a.canal ? ` · ${ROTULO_CANAL[a.canal] || a.canal}` : ''}</span>
                    <span>{new Date(a.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  {a.tipo === 'promessa' && <div className="text-xs">Pagará em {formatDateOnly(a.data_promessa)}{a.valor_prometido ? ` · ${formatCurrency(a.valor_prometido)}` : ''}</div>}
                  {a.descricao && <div className="mt-1">{a.descricao}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {aberto && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onRegistrarRecebimento(card)}>
              <Wallet className="mr-2 h-4 w-4" /> Registrar recebimento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaCardModalMov;
