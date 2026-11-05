// Saída padrão dos geradores de PDF: baixa o arquivo, imprime (abre a janela de impressão do navegador),
// ou devolve o conteúdo em base64 quando for para anexar a um e-mail.
let imprimindo = false;

export const imprimirPdfBase64 = (base64) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
  iframe.src = url;
  const limpar = () => setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 60000);
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { window.open(url, '_blank'); }
    limpar();
  };
  document.body.appendChild(iframe);
};

// Executa um gerador de PDF (que usa finalizarPdf) em modo impressão: em vez de baixar, abre a impressão.
export const comImpressao = async (fn) => {
  imprimindo = true;
  try { return await fn(); } finally { imprimindo = false; }
};

export const finalizarPdf = (doc, nome, opcoes = {}) => {
  if (opcoes.base64) {
    const uri = doc.output('datauristring');
    return { nome, base64: uri.slice(uri.indexOf(',') + 1) };
  }
  if (imprimindo || opcoes.imprimir) {
    const uri = doc.output('datauristring');
    imprimirPdfBase64(uri.slice(uri.indexOf(',') + 1));
    return nome;
  }
  doc.save(nome);
  return nome;
};
