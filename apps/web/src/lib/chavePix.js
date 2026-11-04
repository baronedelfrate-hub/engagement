// Chave Pix do fornecedor: tipos, exibição e cópia para a área de transferência.
export const TIPOS_PIX = [
  { id: 'cpf', rotulo: 'CPF' },
  { id: 'cnpj', rotulo: 'CNPJ' },
  { id: 'celular', rotulo: 'Celular' },
  { id: 'email', rotulo: 'E-mail' },
  { id: 'aleatoria', rotulo: 'Chave aleatória' }
];
export const rotuloTipoPix = (t) => TIPOS_PIX.find((x) => x.id === t)?.rotulo || '';
// CPF, CNPJ e celular vão só com números (é o que o app do banco aceita); e-mail e chave aleatória vão como estão.
export const valorParaCopiar = (tipo, chave) => (['cpf', 'cnpj', 'celular'].includes(tipo) ? String(chave || '').replace(/\D/g, '') : String(chave || '').trim());
export const copiarTexto = async (texto) => {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) {
    try {
      const t = document.createElement('textarea'); t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); document.body.removeChild(t); return ok;
    } catch (e2) { return false; }
  }
};
