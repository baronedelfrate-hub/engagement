import React, { useEffect, useState } from 'react';
import { Copy, Loader2, MessageCircle, Paperclip, Send } from 'lucide-react';
import { copiarTexto } from '@/lib/chavePix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { enviarWhatsApp, telefoneValido, formatarTelefone } from '@/lib/whatsappService';

// Caixa de envio de WhatsApp (Evolution API). Quem chama informa o texto e, se quiser, um anexo (um documento por mensagem).
// anexos: [{ rotulo, gerar: async () => ({ nome|filename, base64 }), marcado?: boolean }] — só o primeiro marcado vai.
// sugestoes: [{ nome, telefone }]
const EnviarWhatsAppDialog = ({ open, onOpenChange, titulo = 'Enviar por WhatsApp', descricao, tipo, refTipo, refId, paraInicial = '', mensagemInicial = '', anexos = [], sugestoes = [], blocoExtra = null, onEnviado }) => {
  const { toast } = useToast();
  const [para, setPara] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [marcado, setMarcado] = useState(-1);
  const [enviando, setEnviando] = useState(false);
  const [incluirBloco, setIncluirBloco] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPara(paraInicial ? formatarTelefone(paraInicial) : ''); setMensagem(mensagemInicial);
    setMarcado(anexos.findIndex((a) => a.marcado !== false));
    setIncluirBloco(false);
    // reinicia só quando a caixa abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // O bloco (valor e chave Pix de cada pagamento) entra e sai do fim da mensagem conforme a marcação.
  const alternarBloco = (ligado) => {
    setIncluirBloco(ligado);
    const bloco = blocoExtra?.texto || '';
    if (!bloco) return;
    setMensagem((m) => (ligado ? `${m.trimEnd()}\n\n${bloco}` : m.replace(`\n\n${bloco}`, '').replace(bloco, '').trimEnd()));
  };
  const copiarMensagem = async () => {
    const ok = await copiarTexto(mensagem);
    toast(ok ? { title: 'Mensagem copiada' } : { title: 'Não foi possível copiar', variant: 'destructive' });
  };

  const enviar = async () => {
    if (!telefoneValido(para)) { toast({ title: 'Telefone inválido', description: 'Use DDD + número, por exemplo (19) 99999-9999.', variant: 'destructive' }); return; }
    if (!mensagem.trim()) { toast({ title: 'Escreva a mensagem', variant: 'destructive' }); return; }
    setEnviando(true);
    try {
      let anexo;
      if (marcado >= 0) {
        const r = await anexos[marcado].gerar();
        if (r?.base64) anexo = { filename: r.filename || r.nome, base64: r.base64, mimetype: r.mimetype || 'application/pdf' };
      }
      await enviarWhatsApp({ tipo, para, mensagem: mensagem.trim(), anexo, ref_tipo: refTipo, ref_id: refId });
      toast({ title: 'WhatsApp enviado', description: `Para ${para}${anexo ? ` com o arquivo ${anexo.filename}` : ''}.` });
      onOpenChange(false);
      if (onEnviado) await onEnviado(para);
    } catch (e) {
      toast({ title: 'Não foi possível enviar o WhatsApp', description: e.message, variant: 'destructive' });
    } finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enviando) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> {titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">WhatsApp do destinatário (com DDD)</Label>
            <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder="(19) 99999-9999" inputMode="tel" />
            {sugestoes.filter((s) => s.telefone).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {sugestoes.filter((s) => s.telefone).map((s) => (
                  <button key={s.telefone + s.nome} type="button" onClick={() => setPara(formatarTelefone(s.telefone))} className="text-xs rounded-full border px-2 py-0.5 hover:bg-muted" title={s.telefone}>{s.nome || s.telefone}</button>
                ))}
              </div>
            )}
          </div>
          {blocoExtra?.texto && (
            <label className="flex items-start gap-2 text-sm rounded-md border border-emerald-300 bg-emerald-50/60 p-3 cursor-pointer">
              <Checkbox checked={incluirBloco} onCheckedChange={(v) => alternarBloco(v === true)} className="mt-0.5" />
              <span><strong>{blocoExtra.pergunta}</strong>{blocoExtra.ajuda && <span className="block text-xs text-muted-foreground mt-0.5">{blocoExtra.ajuda}</span>}</span>
            </label>
          )}
          <div>
            <div className="flex items-center justify-between"><Label className="text-xs">Mensagem</Label><button type="button" onClick={copiarMensagem} className="text-xs inline-flex items-center gap-1 text-primary hover:underline"><Copy className="h-3.5 w-3.5" /> Copiar mensagem</button></div>
            <Textarea rows={8} className="max-h-[38vh]" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          {blocoExtra?.itens?.length > 0 && incluirBloco && (
            <div className="rounded-md border">
              <div className="px-3 py-1.5 text-xs font-medium bg-muted/50 border-b">Copiar a chave Pix ou o código do boleto de cada pagamento</div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {blocoExtra.itens.map((it, i) => (
                  <div key={i} className="px-3 py-2 text-xs">
                    <div className="font-medium truncate">{it.nome} <span className="font-normal text-muted-foreground">· {it.valor} · {it.vencimento}</span></div>
                    {it.copiar ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`font-medium ${it.tipo === 'Boleto' ? 'text-blue-700' : 'text-emerald-700'}`}>{it.tipo.toUpperCase()}:</span>
                        <span className="font-mono break-all select-all">{it.exibir}</span>
                        <button type="button" title={`Copiar ${it.tipo === 'Boleto' ? 'o código do boleto' : 'a chave Pix'}`} className="rounded p-0.5 hover:bg-muted shrink-0"
                          onClick={async () => { const ok = await copiarTexto(it.copiar); toast(ok ? { title: it.tipo === 'Boleto' ? 'Código do boleto copiado' : 'Chave Pix copiada', description: it.exibir } : { title: 'Não foi possível copiar', variant: 'destructive' }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : <div className="text-muted-foreground mt-0.5">Sem chave Pix nem boleto cadastrados.</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {anexos.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Anexo (a mensagem vai como legenda do arquivo)</Label>
              {anexos.map((a, i) => (
                <label key={a.rotulo} className="flex items-center gap-2 text-sm"><Checkbox checked={marcado === i} onCheckedChange={(v) => setMarcado(v === true ? i : -1)} /> {a.rotulo}</label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Sai pelo número de WhatsApp da sua empresa (Cadastros → WhatsApp (conexão)). Use *negrito* e _itálico_ do próprio WhatsApp se quiser.</p>
        </div>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 -mb-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando} className="bg-emerald-600 hover:bg-emerald-700 text-white">{enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarWhatsAppDialog;
