import { supabase } from './customSupabaseClient';

/**
 * Service to handle integration with Uninfe (Mocked/Simulated for Browser Environment)
 * In a real scenario, this would communicate with a backend API that talks to the Uninfe files/service.
 */
export const UnifneIntegrationService = {
  
  async sendNfseToUninfe(nfseData, ambiente = 'homologacao', certificadoPath = '') {
    // 1. Generate XML (Simulated)
    const xml = this.generateRpsXml(nfseData);
    
    // 2. Simulate API call / File Drop
    console.log(`[UNINFE] Sending RPS ${nfseData.numero} to ${ambiente}...`);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Simulate Response based on data
    // Failure scenario simulation for demo purposes if description contains "erro"
    if (nfseData.descricao_servico && nfseData.descricao_servico.includes("erro_simulado")) {
        throw new Error("Simulação de erro de comunicação com SEFAZ");
    }

    const protocolo = `PROT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    return {
        success: true,
        protocolo,
        mensagem: "Lote recebido com sucesso",
        xml_retorno: `<Retorno><Protocolo>${protocolo}</Protocolo><Status>Sucesso</Status></Retorno>`
    };
  },

  async cancelNfseViaUninfe(nfseId, motivo) {
    console.log(`[UNINFE] Cancelling NFSe ${nfseId} - Reason: ${motivo}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
        success: true,
        mensagem: "Cancelamento homologado",
        data_cancelamento: new Date().toISOString()
    };
  },

  async substituteNfseViaUninfe(oldNfseId, newNfseData) {
     console.log(`[UNINFE] Substituting NFSe ${oldNfseId}`);
     // 1. Send new
     const sendResult = await this.sendNfseToUninfe(newNfseData);
     
     // 2. Cancel old (if send new success)
     if (sendResult.success) {
         await this.cancelNfseViaUninfe(oldNfseId, "Substituição de NFS-e");
     }
     
     return sendResult;
  },

  generateRpsXml(data) {
    // Simplified XML generation for audit/storage
    return `
    <Rps>
        <InfRps>
            <IdentificacaoRps>
                <Numero>${data.numero}</Numero>
                <Serie>${data.serie || '1'}</Serie>
                <Tipo>1</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${new Date().toISOString()}</DataEmissao>
            <Servico>
                <Valores>
                    <ValorServicos>${data.valor_servicos}</ValorServicos>
                    <ValorIss>${data.valor_iss}</ValorIss>
                    <Aliquota>${data.aliquota_iss}</Aliquota>
                </Valores>
                <ItemListaServico>${data.codigo_servico}</ItemListaServico>
                <Discriminacao>${data.descricao_servico}</Discriminacao>
                <CodigoCnae>${data.cnae}</CodigoCnae>
            </Servico>
            <Prestador>
                <Cnpj>00000000000191</Cnpj>
            </Prestador>
            <Tomador>
                <IdentificacaoTomador>
                    <CpfCnpj><Cnpj>${data.cliente_cnpj || '00000000000000'}</Cnpj></CpfCnpj>
                </IdentificacaoTomador>
            </Tomador>
        </InfRps>
    </Rps>
    `.trim();
  },

  parseXmlResponse(xmlString) {
      // Mock parser
      return {
          status: 'Sucesso',
          protocolo: xmlString.match(/<Protocolo>(.*?)<\/Protocolo>/)?.[1]
      };
  }
};