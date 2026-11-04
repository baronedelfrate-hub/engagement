import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { nomeDaConversa } from '@/lib/whatsappChat';

// Avisa quando chega mensagem de WhatsApp, em qualquer tela do ERP (não só na tela do WhatsApp):
// balão na tela, aviso do navegador (se liberado), som curto e contador no menu.
const beep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close?.(), 600);
  } catch { /* som é opcional */ }
};
const RESUMO = { imagem: '📷 Foto', video: '🎥 Vídeo', audio: '🎤 Áudio', documento: '📄 Documento', figurinha: 'Figurinha', outro: 'Mensagem' };

export const avisosDoNavegador = () => (typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission);
export const pedirAvisosDoNavegador = async () => (typeof Notification === 'undefined' ? 'indisponivel' : Notification.requestPermission());

export const useWhatsAppNotificacoes = (companyId) => {
  const [naoLidas, setNaoLidas] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const caminho = useRef(location.pathname);
  caminho.current = location.pathname;

  const contar = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('whatsapp_conversas').select('nao_lidas').eq('company_id', companyId).gt('nao_lidas', 0);
    setNaoLidas((data || []).reduce((s, c) => s + (c.nao_lidas || 0), 0));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return undefined;
    contar();
    const canal = supabase.channel(`whatsapp-avisos-${companyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversas', filter: `company_id=eq.${companyId}` }, () => contar())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens', filter: `company_id=eq.${companyId}` }, async (p) => {
        const m = p.new; if (!m || m.de_mim) return;
        // já está olhando esta conversa: não precisa avisar
        const olhando = caminho.current === '/whatsapp' && window.__whatsappConversaAberta === m.conversa_id && document.visibilityState === 'visible';
        contar();
        if (olhando) return;
        const { data: c } = await supabase.from('whatsapp_conversas').select('jid, nome, apelido, telefone, eh_grupo').eq('id', m.conversa_id).maybeSingle();
        const titulo = c ? nomeDaConversa(c) : 'Nova mensagem';
        const corpo = (m.texto && m.texto.trim()) || RESUMO[m.tipo] || 'Mensagem';
        const quem = c?.eh_grupo && m.remetente_nome ? `${m.remetente_nome}: ` : '';
        const msg = `${quem}${corpo}`.slice(0, 140);
        toast({ title: `WhatsApp · ${titulo}`, description: msg });
        beep();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          try {
            const n = new Notification(`WhatsApp · ${titulo}`, { body: msg, tag: `wa-${m.conversa_id}` });
            n.onclick = () => { window.focus(); navigate('/whatsapp'); n.close(); };
          } catch { /* sem aviso do navegador */ }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [companyId, contar, navigate]);

  return { naoLidas, recontar: contar };
};
