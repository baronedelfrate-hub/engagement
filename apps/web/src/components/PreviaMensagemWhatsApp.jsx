import React from 'react';
import { FileText } from 'lucide-react';

// Como as mensagens vão chegar no WhatsApp: um balão verde para cada mensagem, com *negrito* e _itálico_, e o arquivo anexo quando houver.
// mensagens: [{ tipo: 'arquivo', arquivo, legenda } | { tipo: 'texto', texto }]
const formatar = (linha, chave) => String(linha).split(/(```[^`\n]+```|\*[^*\n]+\*|_[^_\n]+_)/g).map((p, i) => {
  if (/^```[^`\n]+```$/.test(p)) return <code key={`${chave}-${i}`} className="font-mono text-[13px] bg-black/5 rounded px-1 select-all">{p.slice(3, -3)}</code>;
  if (/^\*[^*\n]+\*$/.test(p)) return <strong key={`${chave}-${i}`}>{p.slice(1, -1)}</strong>;
  if (/^_[^_\n]+_$/.test(p)) return <em key={`${chave}-${i}`}>{p.slice(1, -1)}</em>;
  return <React.Fragment key={`${chave}-${i}`}>{p}</React.Fragment>;
});

const Balao = ({ m, n, total }) => (
  <div className="ml-auto max-w-[94%] rounded-lg bg-[#d9fdd3] px-2.5 py-1.5 text-sm shadow-sm text-neutral-900">
    {total > 1 && <div className="text-[10px] text-neutral-500 mb-0.5">Mensagem {n} de {total}</div>}
    {m.tipo === 'arquivo' && <div className="mb-1.5 flex items-center gap-2 rounded bg-white/70 px-2 py-1.5 text-xs"><FileText className="h-4 w-4 text-red-500 shrink-0" /><span className="truncate">{m.arquivo || 'arquivo.pdf'}</span></div>}
    <div className="whitespace-pre-wrap break-words">{String(m.tipo === 'arquivo' ? m.legenda : m.texto).split('\n').map((l, i) => <React.Fragment key={i}>{formatar(l, i)}{'\n'}</React.Fragment>)}</div>
    <div className="text-right text-[10px] text-neutral-500 mt-0.5">agora</div>
  </div>
);

const PreviaMensagemWhatsApp = ({ mensagens = [] }) => (
  <div className="rounded-md bg-[#efeae2] p-3 space-y-2 max-h-[45vh] overflow-y-auto">
    {mensagens.length === 0 && <p className="text-xs text-neutral-500">Nada para enviar ainda.</p>}
    {mensagens.map((m, i) => <Balao key={i} m={m} n={i + 1} total={mensagens.length} />)}
  </div>
);
export default PreviaMensagemWhatsApp;
