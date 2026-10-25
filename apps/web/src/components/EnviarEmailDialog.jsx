import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { enviarEmail, emailValido, separarEmails } from '@/lib/emailService';

// Caixa de envio reutilizável. Quem chama informa o texto inicial e como gerar os anexos; o resto (layout, registro) é do servidor.
// anexos: [{ rotulo, gerar: async () => ({ nome|filename, base64 }), marcado?: boolean }]
// sugestoes: [{ nome, email }] (cliques preenchem o campo "Para")
const EnviarEmailDialog = ({ open, onOpenChange, titulo = 'Enviar por e-mail', descricao, tipo, refTipo, refId, paraInicial = '', assuntoInicial = '', mensagemInicial = '', destaques, botao, anexos = [], sugestoes = [], onEnviado }) => {
  const { toast } = useToast();
  const [para, setPara] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [marcados, setMarcados] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPara(paraInicial); setAssunto(assuntoInicial); setMensagem(mensagemInicial);
    setMarcados(Object.fromEntries(anexos.map((a, i) => [i, a.marcado !== false])));
    // reinicia só quando a caixa abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const adicionar = (email) => {
    const atual = separarEmails(para);
    if (!atual.includes(email)) setPara([...atual, email].join(', '));
  };

  const enviar = async () => {
    const lista = separarEmails(para);
    if (!lista.length) { toast({ title: 'Informe o e-mail do destinatário', variant: 'destructive' }); return; }
    const ruim = lista.find((e) => !emailValido(e));
    if (ruim) { toast({ title: `E-mail inválido: ${ruim}`, variant: 'destructive' }); return; }
    if (!assunto.trim() || !mensagem.trim()) { toast({ title: 'Preencha o assunto e a mensagem', variant: 'destructive' }); return; }
    setEnviando(true);
    try {
      const arquivos = [];
      for (let i = 0; i < anexos.length; i += 1) {
        if (!marcados[i]) continue;
        const r = await anexos[i].gerar();
        if (r?.base64) arquivos.push({ filename: r.filename || r.nome, base64: r.base64 });
      }
      await enviarEmail({ tipo, para: lista, assunto: assunto.trim(), mensagem: mensagem.trim(), destaques, botao, anexos: arquivos, ref_tipo: refTipo, ref_id: refId });
      toast({ title: 'E-mail enviado', description: `Para ${lista.join(', ')}${arquivos.length ? ` com ${arquivos.length} anexo(s)` : ''}.` });
      onOpenChange(false);
      if (onEnviado) await onEnviado(lista);
    } catch (e) {
      toast({ title: 'Não foi possível enviar o e-mail', description: e.message, variant: 'destructive' });
    } finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enviando) onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> {titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Para (separe vários e-mails com vírgula)</Label>
            <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder="cliente@empresa.com.br" />
            {sugestoes.filter((s) => s.email).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {sugestoes.filter((s) => s.email).map((s) => (
                  <button key={s.email} type="button" onClick={() => adicionar(s.email)} className="text-xs rounded-full border px-2 py-0.5 hover:bg-muted" title={s.email}>+ {s.nome || s.email}</button>
                ))}
              </div>
            )}
          </div>
          <div><Label className="text-xs">Assunto</Label><Input value={assunto} onChange={(e) => setAssunto(e.target.value)} /></div>
          <div><Label className="text-xs">Mensagem</Label><Textarea rows={7} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></div>
          {anexos.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Anexos</Label>
              {anexos.map((a, i) => (
                <label key={a.rotulo} className="flex items-center gap-2 text-sm"><Checkbox checked={!!marcados[i]} onCheckedChange={(v) => setMarcados({ ...marcados, [i]: v === true })} /> {a.rotulo}</label>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">O e-mail sai em nome da sua empresa e as respostas chegam no seu e-mail de login.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando}>{enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarEmailDialog;
