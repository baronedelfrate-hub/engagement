import { unformatCnpj, isCnpjValid } from './cnpjUtils';

/**
 * Consulta de CNPJ na base pública da Receita Federal.
 * Fonte principal: BrasilAPI. Se ela estiver fora do ar ou limitar as consultas, tenta a CNPJ.ws (também pública, com CORS).
 * Em produção com servidor próprio isso deveria passar por ele; aqui o app é só front-end e chama as APIs direto.
 */
const comTimeout = async (url, ms = 6000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { signal: controller.signal }); } finally { clearTimeout(timeoutId); }
};

const doBrasilApi = (d) => ({
  cnpj: d.cnpj,
  razao_social: d.razao_social,
  nome_fantasia: d.nome_fantasia,
  data_abertura: d.data_inicio_atividade,
  situacao_cadastral: d.situacao_cadastral,
  cnae_codigo: d.cnae_fiscal ? String(d.cnae_fiscal) : '',
  cnae_principal: d.cnae_fiscal_descricao,
  logradouro: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ').trim() || d.logradouro,
  numero: d.numero,
  complemento: d.complemento,
  bairro: d.bairro,
  municipio: d.municipio,
  uf: d.uf,
  cep: d.cep,
  telefone: d.ddd_telefone_1,
  email: d.email,
  data_consulta: new Date().toISOString()
});

const doCnpjWs = (d) => {
  const e = d.estabelecimento || {};
  return {
    cnpj: e.cnpj,
    razao_social: d.razao_social,
    nome_fantasia: e.nome_fantasia,
    data_abertura: e.data_inicio_atividade,
    situacao_cadastral: /ativa/i.test(e.situacao_cadastral || '') ? 2 : undefined,
    cnae_codigo: e.atividade_principal?.subclasse ? String(e.atividade_principal.subclasse).replace(/\D/g, '') : '',
    cnae_principal: e.atividade_principal?.descricao,
    logradouro: [e.tipo_logradouro, e.logradouro].filter(Boolean).join(' ').trim(),
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    municipio: e.cidade?.nome,
    uf: e.estado?.sigla,
    cep: e.cep,
    telefone: `${e.ddd1 || ''}${e.telefone1 || ''}`,
    email: e.email,
    data_consulta: new Date().toISOString()
  };
};

export const cnpjService = {
  fetchCnpjData: async (cnpj) => {
    const cleanCnpj = unformatCnpj(cnpj);

    if (!isCnpjValid(cleanCnpj)) {
      return { success: false, error: 'CNPJ inválido', errorType: 'INVALID_FORMAT' };
    }

    let falhaPrincipal = null;
    try {
      const response = await comTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) return { success: true, data: doBrasilApi(await response.json()) };
      if (response.status === 404) return { success: false, error: 'CNPJ não encontrado na base de dados.', errorType: 'NOT_FOUND' };
      falhaPrincipal = response.status === 429 ? 'RATE_LIMIT' : 'SERVICE_ERROR';
    } catch (error) {
      falhaPrincipal = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    }

    // Plano B
    try {
      const response = await comTimeout(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
      if (response.ok) return { success: true, data: doCnpjWs(await response.json()) };
      if (response.status === 404) return { success: false, error: 'CNPJ não encontrado na base de dados.', errorType: 'NOT_FOUND' };
    } catch { /* cai para a mensagem abaixo */ }

    const mensagens = {
      RATE_LIMIT: 'Muitas consultas seguidas. Tente novamente em alguns instantes.',
      TIMEOUT: 'A consulta demorou muito. Verifique sua conexão e tente de novo.',
      NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
      SERVICE_ERROR: 'Serviço de consulta indisponível no momento. Preencha manualmente ou tente de novo em instantes.'
    };
    return { success: false, error: mensagens[falhaPrincipal] || mensagens.SERVICE_ERROR, errorType: falhaPrincipal };
  }
};
