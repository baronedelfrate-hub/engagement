import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Check, CheckCheck, Download, FileText, Loader2, MessageCircle, Mic, Paperclip, Pencil, RefreshCw, Search, Send, Settings, Square, UserPlus, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { statusWhatsApp } from '@/lib/whatsappService';
import { avisosDoNavegador, pedirAvisosDoNavegador } from '@/hooks/useWhatsAppNotificacoes';
import {
  listarConversas, listarMensagens, marcarLida, urlDaMidia, enviarTextoChat, enviarArquivoChat, enviarAudioChat,
  sincronizarChat, baixarMidiaChat, configurarRecebimento, nomeDaConversa, subtituloDaConversa,
  listarContatos, baixarContatos, iniciarConversa, definirNome, formatarTelefoneBR
} from '@/lib/whatsappChat';

const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaRotulo = (d) => {
  const x = new Date(d); const h = new Date();
  const mesmo = (a, b) => a.toDateString() === b.toDateString();
  const ontem = new Date(); ontem.setDate(h.getDate() - 1);
  return mesmo(x, h) ? 'Hoje' : mesmo(x, ontem) ? 'Ontem' : x.toLocaleDateString('pt-BR');
};
const curto = (d) => {
  if (!d) return '';
  const x = new Date(d); const h = new Date();
  return x.toDateString() === h.toDateString() ? hora(d) : x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const Midia = ({ m, empresaId, onBaixada }) => {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  const [baixando, setBaixando] = useState(false);
  useEffect(() => {
    let vivo = true; setUrl(null); setErro(false);
    if (m.midia_path) urlDaMidia(m.midia_path).then((u) => vivo && setUrl(u)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [m.midia_path]);
  const buscar = async () => {
    setBaixando(true);
    try { await baixarMidiaChat(m.id, empresaId); onBaixada?.(); } catch (e) { setErro(true); } finally { setBaixando(false); }
  };
  if (!m.midia_path) {
    return <button type="button" onClick={buscar} disabled={baixando} className="text-xs underline text-primary">{baixando ? 'Baixando…' : `Baixar ${m.tipo === 'audio' ? 'o áudio' : m.tipo === 'imagem' ? 'a foto' : m.tipo === 'video' ? 'o vídeo' : 'o arquivo'}`}{erro ? ' (indisponível)' : ''}</button>;
  }
  if (!url) return <span className="text-xs text-muted-foreground">{erro ? 'Arquivo indisponível' : 'Carregando…'}</span>;
  if (m.tipo === 'imagem' || m.tipo === 'figurinha') return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="max-h-72 rounded-md" /></a>;
  if (m.tipo === 'video') return <video src={url} controls className="max-h-72 rounded-md" />;
  if (m.tipo === 'audio') return <audio src={url} controls className="h-10 max-w-full" />;
  return <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{m.midia_nome || 'Documento'}</span></a>;
};

const Ticks = ({ status }) => (status === 'lida' ? <CheckCheck className="h-3.5 w-3.5 text-sky-500" /> : status === 'entregue' ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />);

// Tela estilo WhatsApp Web: conversas à esquerda, mensagens à direita; texto, anexo e áudio.
const WhatsAppPage = () => {
  const { toast } = useToast();
  const { company_id: companyId, role, loading: authLoading } = useAuthContext();
  const podeGerir = role === 'admin' || role === 'superadmin';
  const [conectado, setConectado] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [busca, setBusca] = useState('');
  const [ativaId, setAtivaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [novaAberta, setNovaAberta] = useState(false);
  const [contatos, setContatos] = useState([]);
  const [buscaContato, setBuscaContato] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [criando, setCriando] = useState(false);
  const [baixandoContatos, setBaixandoContatos] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const fimRef = useRef(null); const gravadorRef = useRef(null); const pedacosRef = useRef([]); const relogioRef = useRef(null);
  const ativaRef = useRef(null);
  ativaRef.current = ativaId;
  const [avisos, setAvisos] = useState(avisosDoNavegador());
  useEffect(() => { window.__whatsappConversaAberta = ativaId; return () => { window.__whatsappConversaAberta = null; }; }, [ativaId]);

  const ativa = useMemo(() => conversas.find((c) => c.id === ativaId) || null, [conversas, ativaId]);

  const carregarConversas = useCallback(async () => {
    try { setConversas(await listarConversas(companyId)); } catch (e) { toast({ title: 'Erro ao carregar conversas', description: e.message, variant: 'destructive' }); }
  }, [toast, companyId]);
  const carregarMensagens = useCallback(async (id) => {
    if (!id) return setMensagens([]);
    try { setMensagens(await listarMensagens(id)); } catch (e) { toast({ title: 'Erro ao carregar mensagens', description: e.message, variant: 'destructive' }); }
  }, [toast]);

  useEffect(() => {
    if (authLoading || !companyId) return;
    statusWhatsApp(companyId).then((s) => setConectado(!!s?.conectado)).catch(() => setConectado(false));
    carregarConversas();
  }, [authLoading, companyId, carregarConversas]);

  // tempo real: mensagem nova ou conversa atualizada
  useEffect(() => {
    if (!companyId) return undefined;
    const canal = supabase.channel(`whatsapp-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversas', filter: `company_id=eq.${companyId}` }, () => carregarConversas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_mensagens', filter: `company_id=eq.${companyId}` }, (p) => {
        if (p.new?.conversa_id && p.new.conversa_id === ativaRef.current) { carregarMensagens(ativaRef.current); marcarLida(ativaRef.current); }
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [companyId, carregarConversas, carregarMensagens]);

  useEffect(() => { carregarMensagens(ativaId); if (ativaId) marcarLida(ativaId).then(() => carregarConversas()); }, [ativaId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens.length, ativaId]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? conversas.filter((c) => nomeDaConversa(c).toLowerCase().includes(q) || (c.ultima_mensagem || '').toLowerCase().includes(q)) : conversas;
  }, [conversas, busca]);

  const apos = async () => { await carregarMensagens(ativaId); await carregarConversas(); };
  const mandarTexto = async () => {
    const t = texto.trim();
    if (!t || !ativa || enviando) return;
    setEnviando(true);
    try { await enviarTextoChat(ativa.jid, t, companyId); setTexto(''); await apos(); }
    catch (e) { toast({ title: 'Não foi possível enviar', description: e.message, variant: 'destructive' }); }
    finally { setEnviando(false); }
  };
  const mandarArquivos = async (arquivos) => {
    if (!ativa || !arquivos.length) return;
    setEnviando(true);
    try {
      for (const f of arquivos) {
        if (f.size > 15 * 1024 * 1024) { toast({ title: 'Arquivo grande demais', description: `${f.name} passa de 15 MB.`, variant: 'destructive' }); continue; }
        await enviarArquivoChat(ativa.jid, f, arquivos.length === 1 ? texto.trim() : '', companyId);
      }
      setTexto(''); await apos();
    } catch (e) { toast({ title: 'Não foi possível enviar o arquivo', description: e.message, variant: 'destructive' }); }
    finally { setEnviando(false); }
  };

  const iniciarGravacao = async () => {
    if (!ativa) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      const g = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      pedacosRef.current = [];
      g.ondataavailable = (e) => { if (e.data.size) pedacosRef.current.push(e.data); };
      g.start(); gravadorRef.current = g; setGravando(true); setSegundos(0);
      relogioRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch (e) { toast({ title: 'Sem acesso ao microfone', description: 'Libere o microfone no navegador para gravar áudio.', variant: 'destructive' }); }
  };
  const pararGravacao = (enviar) => {
    const g = gravadorRef.current; if (!g) return;
    clearInterval(relogioRef.current); setGravando(false);
    g.onstop = async () => {
      g.stream.getTracks().forEach((t) => t.stop());
      if (!enviar) return;
      const blob = new Blob(pedacosRef.current, { type: g.mimeType || 'audio/webm' });
      if (blob.size < 800) return;
      setEnviando(true);
      try { await enviarAudioChat(ativa.jid, blob, companyId); await apos(); }
      catch (e) { toast({ title: 'Não foi possível enviar o áudio', description: e.message, variant: 'destructive' }); }
      finally { setEnviando(false); }
    };
    g.stop();
  };
  useEffect(() => () => { clearInterval(relogioRef.current); gravadorRef.current?.stream?.getTracks?.().forEach((t) => t.stop()); }, []);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarChat(companyId);
      await carregarConversas(); if (ativaId) await carregarMensagens(ativaId);
      toast({ title: 'Conversas sincronizadas', description: `${r.conversas || 0} conversas, ${r.mensagens || 0} mensagens novas.` });
    } catch (e) { toast({ title: 'Não foi possível sincronizar', description: e.message, variant: 'destructive' }); }
    finally { setSincronizando(false); }
  };
  const ativarRecebimento = async () => {
    try { await configurarRecebimento(companyId); toast({ title: 'Recebimento ativado', description: 'Agora as mensagens novas chegam aqui. Use "Sincronizar" para trazer as conversas recentes.' }); }
    catch (e) { toast({ title: 'Não foi possível ativar', description: e.message, variant: 'destructive' }); }
  };

  const abrirNova = async () => {
    setNovaAberta(true); setBuscaContato(''); setNovoNome(''); setNovoTel('');
    try { setContatos(await listarContatos(companyId)); } catch (e) { /* lista vazia */ }
  };
  const abrirConversaDe = async (c) => {
    // contato que já tem conversa: abre. Senão, precisa do telefone para começar.
    const existente = conversas.find((x) => x.jid === c.jid);
    if (existente) { setAtivaId(existente.id); setNovaAberta(false); return; }
    if (!c.telefone) { toast({ title: 'Sem telefone', description: 'Este contato não tem o número visível. Use "Novo contato" com o telefone.', variant: 'destructive' }); return; }
    await criarConversa(c.telefone, c.apelido || c.nome_whatsapp || '');
  };
  const criarConversa = async (tel, nome) => {
    setCriando(true);
    try {
      const r = await iniciarConversa(tel, nome, companyId);
      await carregarConversas();
      setAtivaId(r.conversa_id); setNovaAberta(false);
    } catch (e) { toast({ title: 'Não foi possível iniciar a conversa', description: e.message, variant: 'destructive' }); }
    finally { setCriando(false); }
  };
  const baixarAgenda = async () => {
    setBaixandoContatos(true);
    try { const r = await baixarContatos(companyId); toast({ title: 'Contatos baixados', description: `${r.contatos || 0} contatos trazidos do WhatsApp e ${r.conversasNomeadas || 0} conversas receberam nome.` }); setContatos(await listarContatos(companyId)); await carregarConversas(); }
    catch (e) { toast({ title: 'Não foi possível baixar os contatos', description: e.message, variant: 'destructive' }); }
    finally { setBaixandoContatos(false); }
  };
  const salvarNome = async () => {
    if (!ativa) return;
    const { error } = await definirNome(ativa.id, nomeEdicao);
    if (error) { toast({ title: 'Não foi possível salvar o nome', description: error.message, variant: 'destructive' }); return; }
    setEditandoNome(false); await carregarConversas();
  };
  const contatosFiltrados = useMemo(() => {
    const q = buscaContato.trim().toLowerCase(); const dq = q.replace(/\D/g, '');
    return contatos.filter((c) => c.apelido || c.nome_whatsapp || c.telefone).filter((c) => !q
      || (c.apelido || '').toLowerCase().includes(q) || (c.nome_whatsapp || '').toLowerCase().includes(q) || (dq && (c.telefone || '').includes(dq))).slice(0, 80);
  }, [contatos, buscaContato]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>WhatsApp - Engagement ERP</title></Helmet>
      {conectado === false && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex flex-wrap items-center gap-2">
          O WhatsApp desta empresa não está conectado.
          <Link to="/configuracoes/whatsapp" className="underline font-medium">Conectar agora</Link>
        </div>
      )}
      <div className="flex h-[calc(100vh-190px)] min-h-[480px] border rounded-lg overflow-hidden bg-background">
        {/* conversas */}
        <aside className={`w-full md:w-80 border-r flex flex-col shrink-0 ${ativa ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-2 border-b flex items-center gap-2">
            <div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8 h-9" placeholder="Buscar conversa" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
            <Button variant="ghost" size="icon" className="h-9 w-9" title="Sincronizar conversas" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
            {avisos !== 'indisponivel' && <Button variant="ghost" size="icon" className="h-9 w-9" title={avisos === 'granted' ? 'Avisos do navegador ligados' : avisos === 'denied' ? 'Avisos bloqueados no navegador (libere nas permissões do site)' : 'Ligar avisos do navegador'}
              onClick={async () => { const r = await pedirAvisosDoNavegador(); setAvisos(r); if (r === 'granted') toast({ title: 'Avisos ligados', description: 'Você será avisado de novas mensagens mesmo com outra aba aberta.' }); }}>
              {avisos === 'granted' ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4" />}</Button>}
            <Button variant="ghost" size="icon" className="h-9 w-9" title="Nova conversa / novo contato" onClick={abrirNova}><UserPlus className="h-4 w-4" /></Button>
            {podeGerir && <Button variant="ghost" size="icon" className="h-9 w-9" title="Ativar recebimento de mensagens" onClick={ativarRecebimento}><Settings className="h-4 w-4" /></Button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtradas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda. Conecte o número, ative o recebimento (engrenagem) e clique em sincronizar.</p>}
            {filtradas.map((c) => (
              <button key={c.id} type="button" onClick={() => setAtivaId(c.id)} className={`w-full text-left px-3 py-2.5 border-b flex gap-3 hover:bg-muted/50 ${c.id === ativaId ? 'bg-muted' : ''}`}>
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">{c.eh_grupo ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="font-medium text-sm truncate">{nomeDaConversa(c)}</span><span className={`text-[11px] shrink-0 ${c.nao_lidas ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>{curto(c.ultima_data)}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground truncate">{c.ultima_mensagem || ''}</span>{c.nao_lidas > 0 && <span className="bg-emerald-500 text-white text-[11px] rounded-full px-1.5 min-w-[18px] text-center">{c.nao_lidas}</span>}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* conversa */}
        <section className={`flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-muted/30 ${ativa ? 'flex' : 'hidden md:flex'}`}>
          {!ativa ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2"><MessageCircle className="h-12 w-12" /><p>Escolha uma conversa para começar</p></div>
          ) : (
            <>
              <header className="px-4 py-2.5 bg-background border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setAtivaId(null)}><X className="h-4 w-4" /></Button>
                <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">{ativa.eh_grupo ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</div>
                <div className="min-w-0 flex-1">
                  {editandoNome ? (
                    <div className="flex items-center gap-1"><Input autoFocus className="h-8" value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false); }} placeholder="Nome do contato" /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={salvarNome}><Check className="h-4 w-4" /></Button></div>
                  ) : (
                    <div className="flex items-center gap-1"><span className="font-medium text-sm truncate">{nomeDaConversa(ativa)}</span>{!ativa.eh_grupo && <button type="button" title="Dar nome a este contato" className="p-1 rounded hover:bg-muted" onClick={() => { setNomeEdicao(ativa.apelido || (ativa.nome && !/^[0-9+\s()-]+$/.test(ativa.nome) ? ativa.nome : '')); setEditandoNome(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">{subtituloDaConversa(ativa)}</div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {mensagens.map((m, i) => {
                  const novoDia = i === 0 || diaRotulo(mensagens[i - 1].data) !== diaRotulo(m.data);
                  return (
                    <React.Fragment key={m.id}>
                      {novoDia && <div className="text-center my-2"><span className="text-[11px] bg-background/80 rounded px-2 py-0.5 shadow-sm">{diaRotulo(m.data)}</span></div>}
                      <div className={`flex ${m.de_mim ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-lg px-2.5 py-1.5 shadow-sm text-sm ${m.de_mim ? 'bg-[#d9fdd3] dark:bg-emerald-900/60' : 'bg-background'}`}>
                          {ativa.eh_grupo && !m.de_mim && m.remetente_nome && <div className="text-[11px] font-semibold text-emerald-700">{m.remetente_nome}</div>}
                          {['imagem', 'video', 'audio', 'documento', 'figurinha'].includes(m.tipo) && <div className="mb-1"><Midia m={m} empresaId={companyId} onBaixada={apos} /></div>}
                          {m.texto && <div className="whitespace-pre-wrap break-words">{m.texto}</div>}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-0.5">{hora(m.data)}{m.de_mim && <Ticks status={m.status} />}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={fimRef} />
              </div>
              <footer className="px-3 py-2 bg-background border-t flex items-end gap-2">
                {gravando ? (
                  <>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => pararGravacao(false)} title="Cancelar"><X className="h-5 w-5" /></Button>
                    <div className="flex-1 flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />Gravando {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}</div>
                    <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => pararGravacao(true)} title="Enviar áudio"><Square className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <label className="cursor-pointer p-2 rounded-md hover:bg-muted" title="Anexar arquivo">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <input type="file" multiple className="hidden" disabled={enviando} onChange={(e) => { mandarArquivos(Array.from(e.target.files || [])); e.target.value = ''; }} />
                    </label>
                    <textarea rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma mensagem"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mandarTexto(); } }}
                      className="flex-1 resize-none max-h-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                    {texto.trim() ? (
                      <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700" onClick={mandarTexto} disabled={enviando}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={iniciarGravacao} disabled={enviando} title="Gravar áudio">{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-5 w-5" />}</Button>
                    )}
                  </>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
      <Dialog open={novaAberta} onOpenChange={setNovaAberta}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium">Novo contato</div>
              <Input placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              <Input placeholder="Telefone com DDD, ex.: (19) 99999-9999" value={novoTel} onChange={(e) => setNovoTel(e.target.value)} />
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={criando || novoTel.replace(/\D/g, '').length < 10} onClick={() => criarConversa(novoTel, novoNome)}>
                {criando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}Iniciar conversa
              </Button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Ou escolha um contato</div>
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={baixarAgenda} disabled={baixandoContatos}>{baixandoContatos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Baixar contatos do WhatsApp</Button>
              </div>
              <Input placeholder="Buscar por nome ou telefone" value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} className="mb-2" />
              <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                {contatosFiltrados.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum contato. Clique em "Baixar contatos do WhatsApp" ou cadastre um novo acima.</p>}
                {contatosFiltrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => abrirConversaDe(c)} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm">
                    <div className="font-medium truncate">{c.apelido || c.nome_whatsapp || formatarTelefoneBR(c.telefone)}</div>
                    <div className="text-[11px] text-muted-foreground">{c.telefone ? formatarTelefoneBR(c.telefone) : 'Número oculto pelo WhatsApp'}{c.apelido && c.nome_whatsapp && c.apelido !== c.nome_whatsapp ? ` · WhatsApp: ${c.nome_whatsapp}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppPage;
