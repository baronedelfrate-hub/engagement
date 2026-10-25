import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, MessageCircle, PlugZap, QrCode, RefreshCw, Send, Unplug, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { statusWhatsApp, qrCodeWhatsApp, criarInstanciaWhatsApp, desconectarWhatsApp, enviarWhatsApp, telefoneValido } from '@/lib/whatsappService';

const ROTULO = { open: 'Conectado', close: 'Desconectado', connecting: 'Conectando…' };

// Conexão do WhatsApp da plataforma (Evolution API): mostra o estado, gera o QR code para ler no celular, cria a instância e desconecta.
const WhatsAppConexao = () => {
  const { toast } = useToast();
  const [estado, setEstado] = useState(null); // { estado, conectado } | { erro }
  const [carregando, setCarregando] = useState(true);
  const [qr, setQr] = useState(null);
  const [codigo, setCodigo] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [trabalhando, setTrabalhando] = useState(false);
  const [telefoneTeste, setTelefoneTeste] = useState('');
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const timer = useRef(null);
  const ultimoQr = useRef(0);

  const consultar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const r = await statusWhatsApp();
      setEstado({ estado: r.estado, conectado: r.conectado });
      if (r.conectado) { setQr(null); setCodigo(null); }
      return r;
    } catch (e) {
      setEstado({ erro: e.message });
      return null;
    } finally { if (!silencioso) setCarregando(false); }
  }, []);

  const gerarQr = useCallback(async (manual = false) => {
    if (manual) setGerando(true);
    try {
      const r = await qrCodeWhatsApp();
      ultimoQr.current = Date.now();
      setQr(r.qr || null); setCodigo(r.codigoPareamento || null);
      if (!r.qr && manual) toast({ title: 'A Evolution API não devolveu um QR code', description: 'Se o WhatsApp já estiver conectado, atualize o estado. Caso contrário, tente de novo em alguns segundos.' });
    } catch (e) {
      if (manual) toast({ title: 'Não foi possível gerar o QR code', description: e.message, variant: 'destructive' });
    } finally { if (manual) setGerando(false); }
  }, [toast]);

  useEffect(() => { consultar(); }, [consultar]);

  // Com o QR na tela: confere a conexão a cada 4 s e renova o QR a cada 25 s (ele expira rápido).
  useEffect(() => {
    if (!qr) return undefined;
    timer.current = setInterval(async () => {
      const r = await consultar(true);
      if (r?.conectado) { toast({ title: 'WhatsApp conectado!', description: 'A plataforma já pode enviar mensagens.' }); return; }
      if (Date.now() - ultimoQr.current > 25000) gerarQr(false);
    }, 4000);
    return () => clearInterval(timer.current);
  }, [qr, consultar, gerarQr, toast]);

  const criar = async () => {
    setTrabalhando(true);
    try {
      const r = await criarInstanciaWhatsApp();
      ultimoQr.current = Date.now();
      setQr(r.qr || null); setCodigo(r.codigoPareamento || null);
      toast({ title: 'Instância criada', description: r.qr ? 'Leia o QR code com o celular.' : 'Clique em "Gerar QR code".' });
      await consultar(true);
    } catch (e) { toast({ title: 'Não foi possível criar a instância', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o WhatsApp da plataforma? Os envios param até conectar de novo.')) return;
    setTrabalhando(true);
    try {
      await desconectarWhatsApp();
      toast({ title: 'WhatsApp desconectado' });
      setQr(null); setCodigo(null);
      await consultar(true);
    } catch (e) { toast({ title: 'Não foi possível desconectar', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const testar = async () => {
    if (!telefoneValido(telefoneTeste)) { toast({ title: 'Telefone inválido', description: 'Use DDD + número.', variant: 'destructive' }); return; }
    setEnviandoTeste(true);
    try {
      await enviarWhatsApp({ tipo: 'outro', para: telefoneTeste, mensagem: 'Teste de envio do ERP Engagement. Se você recebeu esta mensagem, a conexão do WhatsApp está funcionando. ✅' });
      toast({ title: 'Mensagem de teste enviada', description: `Para ${telefoneTeste}.` });
    } catch (e) { toast({ title: 'Não foi possível enviar o teste', description: e.message, variant: 'destructive' }); }
    finally { setEnviandoTeste(false); }
  };

  const conectado = !!estado?.conectado;
  const semConfig = estado?.erro && /configurad/i.test(estado.erro);

  return (
    <>
      <Helmet><title>Conexão do WhatsApp</title></Helmet>
      <PageHeader
        title="Conexão do WhatsApp"
        description="O número conectado aqui é o que envia as mensagens da plataforma (cobrança, propostas, OS, relatórios). Leia o QR code com o celular do número que vai enviar."
        action={<Button variant="outline" size="sm" onClick={() => consultar()} disabled={carregando}><RefreshCw className={`w-4 h-4 mr-2 ${carregando ? 'animate-spin' : ''}`} /> Atualizar estado</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Estado da conexão</CardTitle>
            <CardDescription>Instância da Evolution API usada por todas as empresas da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {carregando && !estado ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : estado?.erro ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>{estado.erro}</p>
                  {semConfig && <p className="mt-1 text-xs">Cadastre os segredos EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE no Supabase (Edge Functions → Secrets).</p>}
                  {!semConfig && /n[ãa]o existe|not found|does not exist/i.test(estado.erro) && <p className="mt-1 text-xs">A instância ainda não existe na Evolution API. Use "Criar instância" abaixo.</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {conectado ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <PlugZap className="h-6 w-6 text-muted-foreground" />}
                <Badge variant={conectado ? 'success' : 'outline'} className="text-sm">{ROTULO[estado?.estado] || estado?.estado || '—'}</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!conectado && !semConfig && <Button onClick={() => gerarQr(true)} disabled={gerando || trabalhando}>{gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}Gerar QR code</Button>}
              {!conectado && !semConfig && <Button variant="outline" onClick={criar} disabled={trabalhando || gerando}>{trabalhando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}Criar instância</Button>}
              {conectado && <Button variant="outline" className="text-destructive" onClick={desconectar} disabled={trabalhando}>{trabalhando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}Desconectar</Button>}
            </div>

            {conectado && (
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs">Enviar mensagem de teste para</Label>
                <div className="flex gap-2">
                  <Input value={telefoneTeste} onChange={(e) => setTelefoneTeste(e.target.value)} placeholder="(19) 99999-9999" inputMode="tel" />
                  <Button onClick={testar} disabled={enviandoTeste} className="bg-emerald-600 hover:bg-emerald-700 text-white">{enviandoTeste ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Testar</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><QrCode className="h-5 w-5" /> QR code</CardTitle>
            <CardDescription>No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 min-h-[260px] justify-center">
            {conectado ? (
              <p className="text-sm text-muted-foreground text-center">Já está conectado. Para trocar de número, desconecte e gere um novo QR code.</p>
            ) : qr ? (
              <>
                <img src={qr} alt="QR code do WhatsApp" className="w-60 h-60 rounded-md border bg-white p-2" />
                {codigo && <p className="text-sm">Ou digite o código no celular: <strong className="font-mono tracking-widest">{codigo}</strong></p>}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Aguardando a leitura… o QR code se renova sozinho.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">Clique em "Gerar QR code" para conectar o número.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default WhatsAppConexao;
