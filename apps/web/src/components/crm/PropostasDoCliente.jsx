import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { listarPropostasPorDocumento, abrirPdfProposta, moeda, STATUS_PROPOSTA } from '@/lib/crmService';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

// Propostas do cliente no cadastro dele (ligadas pelo CPF/CNPJ).
const PropostasDoCliente = ({ companyId, documento }) => {
  const { toast } = useToast();
  const [lista, setLista] = useState(null);

  useEffect(() => {
    let ativo = true;
    if (!companyId || !documento) { setLista([]); return undefined; }
    listarPropostasPorDocumento(companyId, documento)
      .then((l) => { if (ativo) setLista(l); })
      .catch(() => { if (ativo) setLista([]); });
    return () => { ativo = false; };
  }, [companyId, documento]);

  const abrir = async (path) => {
    try { await abrirPdfProposta(path); }
    catch (err) { toast({ title: 'Não foi possível abrir o PDF', description: err.message, variant: 'destructive' }); }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Propostas</CardTitle>
        <CardDescription>Propostas deste cliente no CRM, com o PDF anexado.</CardDescription>
      </CardHeader>
      <CardContent>
        {lista === null ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma proposta ligada a este CPF/CNPJ.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {lista.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <Link to={`/crm/propostas/${p.id}`} className="font-medium text-blue-600 hover:underline">{p.numero}{p.versao > 1 ? ` v${p.versao}` : ''}</Link>
                <span className="flex-1 min-w-[180px] truncate">{p.titulo}</span>
                <span className="text-xs text-muted-foreground">{fmt(p.data_emissao)}</span>
                <span className="w-28 text-right">{moeda(p.valor_total)}</span>
                <Badge variant="outline">{STATUS_PROPOSTA[p.status] || p.status}</Badge>
                {p.pdf_path ? <button type="button" onClick={() => abrir(p.pdf_path)} className="text-blue-600 hover:underline text-xs">PDF</button> : <span className="text-xs text-muted-foreground">sem PDF</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropostasDoCliente;
