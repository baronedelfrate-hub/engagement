import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { rotuloTipoPix, valorParaCopiar, copiarTexto } from '@/lib/chavePix';

// Chave Pix do fornecedor com botão de copiar, para quem for fazer o pagamento no banco.
const ChavePix = ({ fornecedor, className = '' }) => {
  const { toast } = useToast();
  if (!fornecedor?.chave_pix) return null;
  const copiar = async (e) => {
    e.stopPropagation();
    const ok = await copiarTexto(valorParaCopiar(fornecedor.tipo_chave_pix, fornecedor.chave_pix));
    toast(ok ? { title: 'Chave Pix copiada', description: fornecedor.chave_pix } : { title: 'Não foi possível copiar', description: 'Selecione e copie a chave manualmente.', variant: 'destructive' });
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <span className="font-medium text-emerald-700 dark:text-emerald-400">PIX{fornecedor.tipo_chave_pix ? ` ${rotuloTipoPix(fornecedor.tipo_chave_pix)}` : ''}:</span>
      <span className="font-mono select-all">{fornecedor.chave_pix}</span>
      <button type="button" onClick={copiar} title="Copiar chave Pix" className="rounded p-0.5 hover:bg-muted"><Copy className="h-3.5 w-3.5" /></button>
    </span>
  );
};
export default ChavePix;
