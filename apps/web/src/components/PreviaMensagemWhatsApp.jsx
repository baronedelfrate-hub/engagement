import React from 'react';
import { FileText } from 'lucide-react';

// Como a mensagem vai chegar no WhatsApp: balão verde, *negrito* e _itálico_, e o arquivo anexo (se houver).
const formatar = (linha, chave) => String(linha).split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((p, i) => {
  if (/^\*[^*\n]+\*$/.test(p)) return <strong key={`${chave}-${i}`}>{p.slice(1, -1)}</strong>;
  if (/^_[^_\n]+_$/.test(p)) return <em key={`${chave}-${i}`}>{p.slice(1, -1)}</em>;
  return <React.Fragment key={`${chave}-${i}`}>{p}</React.Fragment>;
});

const PreviaMensagemWhatsApp = ({ texto, arquivos = [] }) => (
  <div className="rounded-md bg-[#efeae2] p-3">
    <div className="ml-auto max-w-[92%] rounded-lg bg-[#d9fdd3] px-2.5 py-1.5 text-sm shadow-sm text-neutral-900">
      {arquivos.map((a) => (
        <div key={a} className="mb-1.5 flex items-center gap-2 rounded bg-white/70 px-2 py-1.5 text-xs"><FileText className="h-4 w-4 text-red-500 shrink-0" /><span className="truncate">{a}</span></div>
      ))}
      <div className="whitespace-pre-wrap break-words">{String(texto || '').split('\n').map((l, i) => <React.Fragment key={i}>{formatar(l, i)}{'\n'}</React.Fragment>)}</div>
      <div className="text-right text-[10px] text-neutral-500 mt-0.5">agora</div>
    </div>
  </div>
);
export default PreviaMensagemWhatsApp;
