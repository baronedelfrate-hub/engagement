import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { imprimirPdfBase64 } from '@/lib/pdfSaida';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Mostra o PDF (base64) dentro de uma janela, antes de enviar.
const PreviaPdfDialog = ({ open, onOpenChange, titulo = 'Prévia do arquivo', nome = 'relatorio.pdf', base64 }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!open || !base64) { setUrl(null); return undefined; }
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const u = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [open, base64]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col gap-2">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="text-base truncate">{titulo}</DialogTitle>
          {url && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => imprimirPdfBase64(base64)}><Printer className="h-3.5 w-3.5" />Imprimir</Button>
              <a href={url} download={nome}><Button variant="outline" size="sm" className="gap-1"><Download className="h-3.5 w-3.5" />Baixar</Button></a>
            </div>
          )}
        </DialogHeader>
        {url ? <iframe title={titulo} src={url} className="flex-1 w-full rounded border" /> : <p className="text-sm text-muted-foreground">Sem arquivo para mostrar.</p>}
      </DialogContent>
    </Dialog>
  );
};
export default PreviaPdfDialog;
