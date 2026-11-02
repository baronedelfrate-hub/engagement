import React, { useRef, useState } from 'react';
import { FileText, Loader2, Upload, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { anexarPdfProposta, removerPdfProposta, abrirPdfProposta } from '@/lib/crmService';

// PDF externo da proposta (ex.: feito no Word). Fica guardado na proposta e aparece também no cadastro do cliente.
const PdfAnexado = ({ companyId, proposta, onChange }) => {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setOcupado(true);
    try {
      const salvo = await anexarPdfProposta(companyId, proposta, arquivo);
      onChange({ pdf_path: salvo.pdf_path, pdf_nome: salvo.pdf_nome });
      toast({ title: 'PDF anexado', description: arquivo.name });
    } catch (err) {
      toast({ title: 'Não foi possível anexar', description: err.message, variant: 'destructive' });
    } finally { setOcupado(false); }
  };

  const abrir = async () => {
    try { await abrirPdfProposta(proposta.pdf_path); }
    catch (err) { toast({ title: 'Não foi possível abrir', description: err.message, variant: 'destructive' }); }
  };

  const remover = async () => {
    if (!window.confirm('Remover o PDF anexado desta proposta?')) return;
    setOcupado(true);
    try { await removerPdfProposta(proposta); onChange({ pdf_path: null, pdf_nome: null }); }
    catch (err) { toast({ title: 'Não foi possível remover', description: err.message, variant: 'destructive' }); }
    finally { setOcupado(false); }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> PDF da proposta (arquivo anexado)</CardTitle>
        <CardDescription>Guarde aqui o PDF enviado ao cliente, feito fora do sistema. Ele aparece na lista de propostas e no cadastro do cliente.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {proposta.pdf_path ? (
          <>
            <button type="button" onClick={abrir} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"><ExternalLink className="h-4 w-4" />{proposta.pdf_nome || 'Abrir PDF'}</button>
            <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={() => inputRef.current?.click()}>{ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Substituir</Button>
            <Button type="button" variant="ghost" size="sm" disabled={ocupado} onClick={remover}><Trash2 className="h-4 w-4 mr-1" /> Remover</Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled={ocupado} onClick={() => inputRef.current?.click()}>{ocupado ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />} Anexar PDF</Button>
        )}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={enviar} />
      </CardContent>
    </Card>
  );
};

export default PdfAnexado;
