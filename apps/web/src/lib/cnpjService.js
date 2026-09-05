import { unformatCnpj, isCnpjValid } from './cnpjUtils';

/**
 * Service to fetch CNPJ data from external API (BrasilAPI)
 * Note: In a production environment with a backend, this should proxy through your own server.
 * Since this environment is frontend-only, we call the public API directly.
 */
export const cnpjService = {
  fetchCnpjData: async (cnpj) => {
    const cleanCnpj = unformatCnpj(cnpj);

    if (!isCnpjValid(cleanCnpj)) {
      return {
        success: false,
        error: 'CNPJ inválido',
        errorType: 'INVALID_FORMAT'
      };
    }

    try {
      // Setup timeout for 5 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'CNPJ não encontrado na base de dados.',
            errorType: 'NOT_FOUND'
          };
        }
        if (response.status === 429) {
          return {
            success: false,
            error: 'Muitas requisições. Tente novamente em alguns instantes.',
            errorType: 'RATE_LIMIT'
          };
        }
        return {
          success: false,
          error: 'Serviço indisponível no momento.',
          errorType: 'SERVICE_ERROR'
        };
      }

      const data = await response.json();

      // Map API response to standard format
      return {
        success: true,
        data: {
          cnpj: data.cnpj,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia,
          data_abertura: data.data_inicio_atividade,
          situacao_cadastral: data.situacao_cadastral,
          cnae_principal: data.cnae_fiscal_descricao,
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: data.cep,
          telefone: data.ddd_telefone_1,
          email: data.email,
          data_consulta: new Date().toISOString()
        }
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'A consulta demorou muito. Verifique sua conexão.',
          errorType: 'TIMEOUT'
        };
      }
      return {
        success: false,
        error: 'Erro de conexão. Verifique sua internet.',
        errorType: 'NETWORK_ERROR'
      };
    }
  }
};