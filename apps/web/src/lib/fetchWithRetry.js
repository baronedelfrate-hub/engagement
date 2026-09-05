/**
 * Utilitário para realizar requisições com estratégia de retry (backoff exponencial)
 * Foca especificamente em erros 503 (Service Unavailable) e falhas de rede.
 * 
 * @param {string} url - URL do endpoint
 * @param {object} options - Opções do fetch (method, headers, body, etc)
 * @param {number} retries - Número máximo de tentativas (padrão: 3)
 * @param {number} backoff - Tempo inicial de espera em ms (padrão: 800ms)
 * @param {function} fetcher - (Opcional) Função de fetch customizada para testes/mocks
 */
export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 800, fetcher = fetch) {
  try {
    const response = await fetcher(url, options);

    // Se a resposta for sucesso (200-299), retorna imediatamente
    if (response.ok) {
      console.log(`✅ [fetchWithRetry] Sucesso: ${url}`);
      return response;
    }

    // Capturar erro 503 especificamente
    if (response.status === 503) {
      // Tentar ler o corpo do erro para logs
      let errorBody = 'Sem conteúdo';
      try {
        const clone = response.clone();
        errorBody = await clone.text();
      } catch (e) { /* ignore */ }

      console.warn(`⚠️ [fetchWithRetry] 503 Detectado em ${url}. Tentativas restantes: ${retries}. Body:`, errorBody);

      if (retries > 0) {
        // Calcular tempo de espera (Backoff Exponencial)
        const waitTime = backoff;
        console.log(`⏳ [fetchWithRetry] Aguardando ${waitTime}ms antes do retry...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Recursão com backoff dobrado (800 -> 1600 -> 3200)
        return fetchWithRetry(url, options, retries - 1, backoff * 2, fetcher);
      } else {
        console.error(`❌ [fetchWithRetry] Limite de tentativas excedido para 503 em ${url}. Erro final:`, errorBody);
      }
    }

    // Se for outro erro HTTP (400, 401, 404, 500 sem ser 503), retorna a resposta original para tratamento no componente
    return response;

  } catch (error) {
    // Erros de rede (offline, DNS, timeout) também merecem retry
    console.warn(`⚠️ [fetchWithRetry] Erro de rede em ${url}: ${error.message}. Tentativas restantes: ${retries}`);

    if (retries > 0) {
      const waitTime = backoff;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, fetcher);
    }
    
    // Se esgotou tentativas, lança o erro para cima
    console.error(`❌ [fetchWithRetry] Falha fatal de rede após retries:`, error);
    throw error;
  }
}