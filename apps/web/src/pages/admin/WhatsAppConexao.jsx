import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, MessageCircle, PlugZap, QrCode, RefreshCw, Send, Trash2, Unplug, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { statusWhatsApp, qrCodeWhatsApp, criarInstanciaWhatsApp, desconectarWhatsApp, removerInstanciaWhatsApp, enviarWhatsApp, telefoneValido } from '@/lib/whatsappService';

const ROTULO = { open: 'Conectado', close: 'Desconectado', connecting: 'Conectando…', sem_instancia: 'Sem instância', inexistente: 'Instância não encontrada' };

// Conexão do WhatsApp da empresa (uma instância da Evolution API por empresa): estado, QR code, criar, desconectar e remover.
// O administrador gerencia a própria empresa; o superadmin escolhe a empresa.
const WhatsAppConexao = () => {
  const { toast } = useToast();
  const { role, company_id: minhaEmpresa, loading: authLoading } = useAuthContext();
  const superadmin = role === 'superadmin';
  const podeGerir = superadmin || role === 'admin';
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState(minhaEmpresa || '');
  const [estado, setEstado] = useState(null); // { estado, conectado, instancia } | { erro }
  const [carregando, setCarregando] = useState(true);
  const [qr, setQr] = useState(null);
  const [codigo, setCodigo] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [trabalhando, setTrabalhando] = useState(false);
  const [telefoneTeste, setTelefoneTeste] = useState('');
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const ultimoQr = useRef(0);
  const alvo = superadmin ? empresaId : undefined; // admin comum: a função usa a empresa dele

  useEffect(() => {
    if (!superadmin) return;
    supabase.from('empresas').select('id, razao_social, nome_fantasia').order('razao_social').then(({ data }) => {
      setEmpresas(data || []);
      setEmpresaId((atual) => atual || data?.[0]?.id || '');
    });
  }, [superadmin]);
  useEffect(() => { if (minhaEmpresa && !superadmin) setEmpresaId(minhaEmpresa); }, [minhaEmpresa, superadmin]);

  const consultar = useCallback(async (silencioso = false) => {
    if (superadmin && !empresaId) return null;
    if (!silencioso) setCarregando(true);
    try {
      const r = await statusWhatsApp(alvo);
      setEstado({ estado: r.estado, conectado: r.conectado, instancia: r.instancia });
      if (r.conectado) { setQr(null); setCodigo(null); }
      return r;
    } catch (e) {
      setEstado({ erro: e.message });
      return null;
    } finally { if (!silencioso) setCarregando(false); }
  }, [alvo, superadmin, empresaId]);

  const gerarQr = useCallback(async (manual = false) => {
    if (manual) setGerando(true);
    try {
      const r = await qrCodeWhatsApp(alvo);
      ultimoQr.current = Date.now();
      setQr(r.qr || null); setCodigo(r.codigoPareamento || null);
      if (!r.qr && manual) toast({ title: 'A Evolution API não devolveu um QR code', description: 'Se o WhatsApp já estiver conectado, atualize o estado. Caso contrário, tente de novo em alguns segundos.' });
    } catch (e) {
      if (manual) toast({ title: 'Não foi possível gerar o QR code', description: e.message, variant: 'destructive' });
    } finally { if (manual) setGerando(false); }
  }, [alvo, toast]);

  // trocou de empresa: zera a tela e consulta de novo
  useEffect(() => { setQr(null); setCodigo(null); setEstado(null); if (!authLoading && podeGerir) consultar(); }, [empresaId, authLoading, podeGerir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Com o QR na tela: confere a conexão a cada 4 s e renova o QR a cada 25 s (ele expira rápido).
  useEffect(() => {
    if (!qr) return undefined;
    const t = setInterval(async () => {
      const r = await consultar(true);
      if (r?.conectado) { toast({ title: 'WhatsApp conectado!', description: 'A empresa já pode enviar mensagens.' }); return; }
      if (Date.now() - ultimoQr.current > 25000) gerarQr(false);
    }, 4000);
    return () => clearInterval(t);
  }, [qr, consultar, gerarQr, toast]);

  const criar = async () => {
    setTrabalhando(true);
    try {
      const r = await criarInstanciaWhatsApp(alvo);
      ultimoQr.current = Date.now();
      setQr(r.qr || null); setCodigo(r.codigoPareamento || null);
      toast({ title: 'Instância criada', description: r.qr ? 'Leia o QR code com o celular.' : 'Clique em "Gerar QR code".' });
      await consultar(true);
    } catch (e) { toast({ title: 'Não foi possível criar a instância', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o WhatsApp desta empresa? Os envios param até conectar de novo.')) return;
    setTrabalhando(true);
    try {
      await desconectarWhatsApp(alvo);
      toast({ title: 'WhatsApp desconectado' });
      setQr(null); setCodigo(null);
      await consultar(true);
    } catch (e) { toast({ title: 'Não foi possível desconectar', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const remover = async () => {
    if (!window.confirm('Remover a instância desta empresa? Será preciso criar outra e ler o QR code de novo.')) return;
    setTrabalhando(true);
    try {
      await removerInstanciaWhatsApp(alvo);
      toast({ title: 'Instância removida' });
      setQr(null); setCodigo(null);
      await consultar(true);
    } catch (e) { toast({ title: 'Não foi possível remover', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const testar = async () => {
    if (!telefoneValido(telefoneTeste)) { toast({ title: 'Telefone inválido', description: 'Use DDD + número.', variant: 'destructive' }); return; }
    setEnviandoTeste(true);
    try {
      await enviarWhatsApp({ tipo: 'outro', empresa_id: alvo, para: telefoneTeste, mensagem: 'Teste de envio do ERP Engagement. Se você recebeu esta mensagem, a conexão do WhatsApp está funcionando. ✅' });
      toast({ title: 'Mensagem de teste enviada', description: `Para ${telefoneTeste}.` });
    } catch (e) { toast({ title: 'Não foi possível enviar o teste', description: e.message, variant: 'destructive' }); }
    finally { setEnviandoTeste(false); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!podeGerir) return <p className="text-sm text-muted-foreground py-10 text-center">Somente o administrador da empresa gerencia a conexão do WhatsApp.</p>;

  const conectado = !!estado?.conectado;
  const semConfig = estado?.erro && /configurad/i.test(estado.erro);
  const semInstancia = estado?.estado === 'sem_instancia' || estado?.estado === 'inexistente';
  const empresaAtual = empresas.find((e) => e.id === empresaId);

  return (
    <>
      <Helmet><title>Conexão do WhatsApp</title></Helmet>
      <PageHeader
        title="Conexão do WhatsApp"
        description="Cada empresa tem o seu número. O número conectado aqui envia as mensagens da empresa (cobrança, propostas, OS, relatórios). Leia o QR code com o celular do número que vai enviar."
        action={<Button variant="outline" size="sm" onClick={() => consultar()} disabled={carregando}><RefreshCw className={`w-4 h-4 mr-2 ${carregando ? 'animate-spin' : ''}`} /> Atualizar estado</Button>}
      />

      {superadmin && (
        <div className="mb-4 max-w-sm">
          <Label className="text-xs">Empresa</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Estado da conexão</CardTitle>
            <CardDescription>{empresaAtual ? `Empresa: ${empresaAtual.nome_fantasia || empresaAtual.razao_social}. ` : ''}{estado?.instancia ? `Instância: ${estado.instancia}` : 'Instância própria da empresa na Evolution API.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {carregando && !estado ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : estado?.erro ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>{estado.erro}</p>
                  {semConfig && <p className="mt-1 text-xs">Falta cadastrar EVOLUTION_API_URL e EVOLUTION_API_KEY nos segredos do Supabase (Edge Functions → Secrets). Peça a quem administra a plataforma.</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {conectado ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <PlugZap className="h-6 w-6 text-muted-foreground" />}
                <Badge variant={conectado ? 'success' : 'outline'} className="text-sm">{ROTULO[estado?.estado] || estado?.estado || '—'}</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!conectado && !semConfig && semInstancia && <Button onClick={criar} disabled={trabalhando}>{trabalhando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}Criar instância e conectar</Button>}
              {!conectado && !semConfig && !semInstancia && estado && !estado.erro && <Button onClick={() => gerarQr(true)} disabled={gerando || trabalhando}>{gerando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}Gerar QR code</Button>}
              {conectado && <Button variant="outline" className="text-destructive" onClick={desconectar} disabled={trabalhando}>{trabalhando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}Desconectar</Button>}
              {estado && !estado.erro && estado.estado !== 'sem_instancia' && <Button variant="ghost" className="text-destructive" onClick={remover} disabled={trabalhando}><Trash2 className="h-4 w-4 mr-2" />Remover instância</Button>}
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
              <p className="text-sm text-muted-foreground text-center">{semInstancia ? 'Crie a instância para gerar o QR code.' : 'Clique em "Gerar QR code" para conectar o número.'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default WhatsAppConexao;
