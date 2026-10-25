import React, { useEffect, useState } from 'react';
import { Loader2, MessageCircle, Paperclip, Send } from 'lucide-react';
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
const EnviarWhatsAppDialog = ({ open, onOpenChange, titulo = 'Enviar por WhatsApp', descricao, tipo, refTipo, refId, paraInicial = '', mensagemInicial = '', anexos = [], sugestoes = [], onEnviado }) => {
  const { toast } = useToast();
  const [para, setPara] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [marcado, setMarcado] = useState(-1);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPara(paraInicial ? formatarTelefone(paraInicial) : ''); setMensagem(mensagemInicial);
    setMarcado(anexos.findIndex((a) => a.marcado !== false));
    // reinicia só quando a caixa abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      <DialogContent className="max-w-lg">
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
          <div><Label className="text-xs">Mensagem</Label><Textarea rows={8} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></div>
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
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando} className="bg-emerald-600 hover:bg-emerald-700 text-white">{enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarWhatsAppDialog;
