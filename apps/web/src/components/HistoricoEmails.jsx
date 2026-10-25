import React, { useEffect, useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { listarEnvios } from '@/lib/emailService';
import { listarEnviosWhatsApp, formatarTelefone } from '@/lib/whatsappService';

// Últimos e-mails e WhatsApp enviados a partir de um registro (proposta, título, OS...). Some quando não há nenhum.
const HistoricoEmails = ({ refTipo, refId, recarregar }) => {
  const [itens, setItens] = useState([]);
  useEffect(() => {
    if (!refId) { setItens([]); return; }
    Promise.all([listarEnvios(refTipo, refId).catch(() => []), listarEnviosWhatsApp(refTipo, refId).catch(() => [])]).then(([emails, zaps]) => {
      setItens([
        ...emails.map((e) => ({ id: `e${e.id}`, canal: 'email', status: e.status, quando: e.created_at, para: e.destinatarios.join(', '), anexos: e.anexos?.length || 0, erro: e.erro })),
        ...zaps.map((z) => ({ id: `w${z.id}`, canal: 'whatsapp', status: z.status, quando: z.created_at, para: formatarTelefone(z.destinatario), anexos: z.anexo ? 1 : 0, erro: z.erro }))
      ].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 10));
    });
  }, [refTipo, refId, recarregar]);
  if (!itens.length) return null;
  return (
    <div className="rounded-md border p-3 text-sm space-y-1.5 mb-4">
      <div className="font-medium flex items-center gap-1.5"><Mail className="h-4 w-4" /> Envios ao cliente</div>
      {itens.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={e.status === 'enviado' ? 'success' : 'destructive'}>{e.status === 'enviado' ? 'enviado' : 'erro'}</Badge>
          {e.canal === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Mail className="h-3.5 w-3.5" />}
          <span>{new Date(e.quando).toLocaleString('pt-BR')}</span>
          <span className="truncate">para {e.para}</span>
          {e.anexos > 0 && <span>· {e.anexos} anexo(s)</span>}
          {e.erro && <span className="text-destructive">· {e.erro}</span>}
        </div>
      ))}
    </div>
  );
};

export default HistoricoEmails;
