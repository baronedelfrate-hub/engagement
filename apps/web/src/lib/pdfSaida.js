// Saída padrão dos geradores de PDF: baixa o arquivo, ou devolve o conteúdo em base64 quando for para anexar a um e-mail.
export const finalizarPdf = (doc, nome, opcoes = {}) => {
  if (opcoes.base64) {
    const uri = doc.output('datauristring');
    return { nome, base64: uri.slice(uri.indexOf(',') + 1) };
  }
  doc.save(nome);
  return nome;
};
