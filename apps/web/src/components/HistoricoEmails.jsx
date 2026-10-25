import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { listarEnvios } from '@/lib/emailService';

// Últimos e-mails enviados a partir de um registro (proposta, título, OS...). Some quando não há nenhum.
const HistoricoEmails = ({ refTipo, refId, recarregar }) => {
  const [itens, setItens] = useState([]);
  useEffect(() => {
    if (!refId) { setItens([]); return; }
    listarEnvios(refTipo, refId).then(setItens).catch(() => setItens([]));
  }, [refTipo, refId, recarregar]);
  if (!itens.length) return null;
  return (
    <div className="rounded-md border p-3 text-sm space-y-1.5 mb-4">
      <div className="font-medium flex items-center gap-1.5"><Mail className="h-4 w-4" /> E-mails enviados</div>
      {itens.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={e.status === 'enviado' ? 'success' : 'destructive'}>{e.status === 'enviado' ? 'enviado' : 'erro'}</Badge>
          <span>{new Date(e.created_at).toLocaleString('pt-BR')}</span>
          <span className="truncate">para {e.destinatarios.join(', ')}</span>
          {e.anexos?.length > 0 && <span>· {e.anexos.length} anexo(s)</span>}
          {e.erro && <span className="text-destructive">· {e.erro}</span>}
        </div>
      ))}
    </div>
  );
};

export default HistoricoEmails;
