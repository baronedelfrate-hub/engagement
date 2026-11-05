import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Eye, Loader2, MessageCircle, Paperclip, Send } from 'lucide-react';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import PreviaMensagemWhatsApp from '@/components/PreviaMensagemWhatsApp';
import { copiarTexto } from '@/lib/chavePix';
import { planejarMensagens } from '@/lib/planoMensagens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { enviarWhatsApp, telefoneValido, formatarTelefone } from '@/lib/whatsappService';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Caixa de envio de WhatsApp (Evolution API). Quem chama informa o texto e, se quiser, um anexo (um documento por mensagem).
// anexos: [{ rotulo, gerar: async () => ({ nome|filename, base64 }), marcado?: boolean }] — só o primeiro marcado vai.
// blocoExtra: { pergunta, ajuda, texto, itens } — pagamentos com valor e chave Pix / boleto (vão em mensagens de texto separadas).
// empresaRemetente: empresa cujo WhatsApp envia (só vale para superadmin; vazio = a empresa de quem está logado).
// A prévia usa o MESMO plano de mensagens do envio (lib/planoMensagens).
const EnviarWhatsAppDialog = ({ open, onOpenChange, titulo = 'Enviar por WhatsApp', descricao, tipo, refTipo, refId, paraInicial = '', mensagemInicial = '', anexos = [], sugestoes = [], blocoExtra = null, empresaRemetente, onEnviado }) => {
  const { toast } = useToast();
  const [para, setPara] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [bloco, setBloco] = useState('');
  const [marcado, setMarcado] = useState(-1);
  const [enviando, setEnviando] = useState(false);
  const [incluirBloco, setIncluirBloco] = useState(false);
  const [verMensagem, setVerMensagem] = useState(true);
  const [previa, setPrevia] = useState(null); // { titulo, nome, base64 }
  const [gerandoPrevia, setGerandoPrevia] = useState(-1);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const arquivos = useRef(new Map()); // PDF gerado ao abrir: o que a prévia mostra é o que vai no envio

  const obterArquivo = async (i) => {
    if (!arquivos.current.has(i)) arquivos.current.set(i, await anexos[i].gerar());
    return arquivos.current.get(i);
  };

  useEffect(() => {
    if (!open) return;
    arquivos.current = new Map();
    setPara(paraInicial ? formatarTelefone(paraInicial) : ''); setMensagem(mensagemInicial); setBloco('');
    setMarcado(anexos.findIndex((a) => a.marcado !== false));
    setIncluirBloco(false); setVerMensagem(true); setPrevia(null); setNomeArquivo('');
    // reinicia só quando a caixa abre
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // sabe o nome real do arquivo para mostrar na prévia
  useEffect(() => {
    if (!open || marcado < 0 || !anexos[marcado]) { setNomeArquivo(''); return; }
    let vivo = true;
    obterArquivo(marcado).then((r) => { if (vivo) setNomeArquivo(r?.filename || r?.nome || ''); }).catch(() => { if (vivo) setNomeArquivo(''); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, marcado]);

  const alternarBloco = (ligado) => { setIncluirBloco(ligado); setBloco(ligado ? (blocoExtra?.texto || '') : ''); };

  const anexoMarcado = marcado >= 0 ? anexos[marcado] : null;
  const plano = useMemo(() => planejarMensagens({ texto: mensagem, bloco: incluirBloco ? bloco : '', anexo: anexoMarcado ? { rotulo: anexoMarcado.rotulo } : null }), [mensagem, bloco, incluirBloco, anexoMarcado]);
  const planoVisivel = plano.map((m) => (m.tipo === 'arquivo' ? { ...m, arquivo: nomeArquivo || `${anexoMarcado?.rotulo || 'Arquivo'}.pdf` } : m));

  const copiarMensagem = async () => {
    const todo = plano.map((m) => (m.tipo === 'arquivo' ? m.legenda : m.texto)).join('\n\n');
    const ok = await copiarTexto(todo);
    toast(ok ? { title: 'Mensagem copiada' } : { title: 'Não foi possível copiar', variant: 'destructive' });
  };

  const verPrevia = async (i) => {
    setGerandoPrevia(i);
    try {
      const r = await obterArquivo(i);
      if (!r?.base64) throw new Error('Não foi possível gerar o arquivo.');
      setPrevia({ titulo: anexos[i].rotulo, nome: r.filename || r.nome || 'relatorio.pdf', base64: r.base64 });
    } catch (e) { toast({ title: 'Não foi possível abrir a prévia', description: e.message, variant: 'destructive' }); }
    finally { setGerandoPrevia(-1); }
  };

  const enviar = async () => {
    if (!telefoneValido(para)) { toast({ title: 'Telefone inválido', description: 'Use DDD + número, por exemplo (19) 99999-9999.', variant: 'destructive' }); return; }
    if (!plano.length) { toast({ title: 'Escreva a mensagem', variant: 'destructive' }); return; }
    setEnviando(true);
    try {
      let anexo;
      if (marcado >= 0) {
        const r = await obterArquivo(marcado);
        if (r?.base64) anexo = { filename: r.filename || r.nome, base64: r.base64, mimetype: r.mimetype || 'application/pdf' };
      }
      const base = { tipo, para, ref_tipo: refTipo, ref_id: refId, ...(empresaRemetente ? { empresa_id: empresaRemetente } : {}) };
      for (let i = 0; i < plano.length; i += 1) {
        const m = plano[i];
        if (m.tipo === 'arquivo' && anexo) await enviarWhatsApp({ ...base, mensagem: m.legenda, anexo });
        else await enviarWhatsApp({ ...base, mensagem: m.tipo === 'arquivo' ? m.legenda : m.texto });
        if (i < plano.length - 1) await esperar(1000);
      }
      toast({ title: 'WhatsApp enviado', description: `Para ${para}: ${plano.length} mensagem(ns)${anexo ? ` com o arquivo ${anexo.filename}` : ''}.` });
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
            <div className="flex items-center justify-between"><Label className="text-xs">{anexoMarcado ? 'Mensagem (legenda do arquivo)' : 'Mensagem'}</Label><button type="button" onClick={copiarMensagem} className="text-xs inline-flex items-center gap-1 text-primary hover:underline"><Copy className="h-3.5 w-3.5" /> Copiar mensagens</button></div>
            <Textarea rows={7} className="max-h-[30vh]" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          {blocoExtra?.texto && incluirBloco && (
            <div>
              <Label className="text-xs">Mensagem com os pagamentos (valor e chave Pix ou boleto) — vai separada, para copiar com um toque</Label>
              <Textarea rows={8} className="max-h-[30vh] font-mono text-xs" value={bloco} onChange={(e) => setBloco(e.target.value)} />
            </div>
          )}
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
                <div key={a.rotulo} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={marcado === i} onCheckedChange={(v) => setMarcado(v === true ? i : -1)} /> {a.rotulo}</label>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1" onClick={() => verPrevia(i)} disabled={gerandoPrevia >= 0}>
                    {gerandoPrevia === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}Ver prévia do PDF
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div>
            <button type="button" onClick={() => setVerMensagem((v) => !v)} className="text-xs inline-flex items-center gap-1 text-primary hover:underline"><Eye className="h-3.5 w-3.5" />{verMensagem ? 'Esconder a prévia das mensagens' : 'Ver como as mensagens vão chegar'}</button>
            {verMensagem && <div className="mt-1.5"><PreviaMensagemWhatsApp mensagens={planoVisivel} /><p className="text-[11px] text-muted-foreground mt-1">Esta prévia é exatamente o que será enviado: {plano.length} mensagem(ns), nesta ordem.</p></div>}
          </div>
          <p className="text-xs text-muted-foreground">{empresaRemetente ? 'Sai pelo WhatsApp escolhido no topo da tela.' : 'Sai pelo número de WhatsApp da sua empresa (Cadastros → WhatsApp (conexão)).'} Use *negrito* e _itálico_ do próprio WhatsApp se quiser.</p>
        </div>
        <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-3 -mb-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando} className="bg-emerald-600 hover:bg-emerald-700 text-white">{enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar</Button>
        </DialogFooter>
      </DialogContent>
      <PreviaPdfDialog open={!!previa} onOpenChange={(o) => { if (!o) setPrevia(null); }} titulo={previa?.titulo} nome={previa?.nome} base64={previa?.base64} />
    </Dialog>
  );
};

export default EnviarWhatsAppDialog;
