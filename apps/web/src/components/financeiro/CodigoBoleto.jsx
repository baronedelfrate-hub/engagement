import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { copiarTexto } from '@/lib/chavePix';

// Código de barras / linha digitável do boleto com botão de copiar (vai só com números, que é o que o banco aceita).
export const codigoSoNumeros = (c) => String(c || '').replace(/\D/g, '');

const CodigoBoleto = ({ codigo, className = '' }) => {
  const { toast } = useToast();
  if (!codigo || !String(codigo).trim()) return null;
  const copiar = async (e) => {
    e.stopPropagation();
    const ok = await copiarTexto(codigoSoNumeros(codigo));
    toast(ok ? { title: 'Código do boleto copiado', description: String(codigo).trim() } : { title: 'Não foi possível copiar', description: 'Selecione e copie o código manualmente.', variant: 'destructive' });
  };
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground ${className}`}>
      <span className="font-medium text-blue-700 dark:text-blue-400">BOLETO:</span>
      <span className="font-mono select-all break-all">{String(codigo).trim()}</span>
      <button type="button" onClick={copiar} title="Copiar código do boleto" className="rounded p-0.5 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
    </span>
  );
};
export default CodigoBoleto;
