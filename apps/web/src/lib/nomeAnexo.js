// Nome padrão dos anexos financeiros: "2026.11.03 - FIN - NOME DO FORNECEDOR - NUMERO DO DOCUMENTO" (número só quando houver).
const SEM_ACENTO_PROIBIDOS = /[\\/:*?"<>|]+/g;
const limpar = (s) => String(s || '').replace(SEM_ACENTO_PROIBIDOS, ' ').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim().toUpperCase();
export const dataParaNome = (iso) => String(iso || new Date().toISOString()).slice(0, 10).replace(/-/g, '.');

// "PROV · ...", "CP-123456" (gerado pelo sistema) e textos longos não são número de documento.
export const numeroDocumentoValido = (n) => {
  const t = String(n || '').trim();
  if (!t || /^(PROV|CP-|CR-|FATURA)/i.test(t)) return '';
  return /^[A-Za-z0-9./_-]{1,25}$/.test(t) && /\d/.test(t) ? t.replace(/[\\/:*?"<>|]+/g, '-') : '';
};

export const nomePadraoAnexo = ({ data, fornecedor, documento, nomeOriginal, jaExistentes = [] }) => {
  const ext = (String(nomeOriginal || '').split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const base = `${dataParaNome(data)} - FIN - ${limpar(fornecedor) || 'SEM FORNECEDOR'}${numeroDocumentoValido(documento) ? ` - ${numeroDocumentoValido(documento)}` : ''}`;
  const usados = new Set(jaExistentes.map((n) => String(n).toLowerCase()));
  let nome = `${base}.${ext}`; let i = 2;
  while (usados.has(nome.toLowerCase())) { nome = `${base} (${i}).${ext}`; i += 1; }
  return nome;
};
