// Plano das mensagens de WhatsApp: é o MESMO plano que a prévia mostra e que o envio executa, para a prévia ser fiel.
// - Com arquivo: o texto vai como legenda se couber (o WhatsApp limita a legenda a ~1000 caracteres); se não couber, o arquivo vai com o nome do relatório
//   como legenda e o texto segue em mensagem(ns) de texto.
// - O bloco de pagamentos (valor e chave Pix / boleto) sempre vai em mensagem(ns) de texto separadas, uma chave por linha.
export const LIMITE_LEGENDA = 1000;
export const LIMITE_TEXTO = 3500;

// Divide em pedaços de até `max`, quebrando em linhas em branco (e, se preciso, em linhas) para não cortar um pagamento ao meio.
export const dividirTexto = (texto, max = LIMITE_TEXTO) => {
  const t = String(texto || '').trim();
  if (!t) return [];
  if (t.length <= max) return [t];
  const blocos = t.split(/\n{2,}/);
  const saida = []; let atual = '';
  const empurra = () => { if (atual.trim()) saida.push(atual.trim()); atual = ''; };
  for (const b of blocos) {
    if (b.length > max) { // bloco enorme: quebra por linha
      empurra();
      let parte = '';
      for (const l of b.split('\n')) { if ((parte + '\n' + l).length > max) { if (parte) saida.push(parte.trim()); parte = l; } else parte = parte ? `${parte}\n${l}` : l; }
      if (parte.trim()) saida.push(parte.trim());
      continue;
    }
    if ((atual + '\n\n' + b).length > max) { empurra(); atual = b; } else atual = atual ? `${atual}\n\n${b}` : b;
  }
  empurra();
  return saida;
};

// anexo: { rotulo } | null  ->  [{ tipo: 'arquivo', legenda } | { tipo: 'texto', texto }]
export const planejarMensagens = ({ texto, bloco, anexo }) => {
  const out = [];
  const t = String(texto || '').trim(); const b = String(bloco || '').trim();
  if (anexo) {
    if (t && t.length <= LIMITE_LEGENDA) out.push({ tipo: 'arquivo', legenda: t });
    else { out.push({ tipo: 'arquivo', legenda: anexo.rotulo || 'Relatório' }); dividirTexto(t).forEach((x) => out.push({ tipo: 'texto', texto: x })); }
  } else dividirTexto(t).forEach((x) => out.push({ tipo: 'texto', texto: x }));
  dividirTexto(b).forEach((x) => out.push({ tipo: 'texto', texto: x }));
  return out;
};
