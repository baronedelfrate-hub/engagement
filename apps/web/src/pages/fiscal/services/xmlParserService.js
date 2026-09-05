export const parseXMLFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Basic check
        const isError = xmlDoc.getElementsByTagName("parsererror");
        if (isError.length > 0) {
          throw new Error("Arquivo XML inválido ou mal formatado.");
        }

        const data = {
          numero: '',
          serie: '',
          chave_acesso: '',
          data_emissao: '',
          cnpj_fornecedor: '',
          nome_fornecedor: '',
          valor_total: 0,
          valor_impostos: 0,
        };

        // Get Chave de Acesso (from <protNFe><infProt><chNFe>) or ID attr
        const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
        if (infNFe && infNFe.getAttribute("Id")) {
          data.chave_acesso = infNFe.getAttribute("Id").replace('NFe', '');
        }

        // Get Ide data
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        if (ide) {
          data.numero = ide.getElementsByTagName("nNF")[0]?.textContent || '';
          data.serie = ide.getElementsByTagName("serie")[0]?.textContent || '';
          
          const dhEmi = ide.getElementsByTagName("dhEmi")[0]?.textContent;
          if (dhEmi) {
            // dhEmi format: 2023-10-25T10:00:00-03:00 -> extract YYYY-MM-DD
            data.data_emissao = dhEmi.substring(0, 10);
          }
        }

        // Get Emit (Fornecedor) data
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        if (emit) {
          data.cnpj_fornecedor = emit.getElementsByTagName("CNPJ")[0]?.textContent || '';
          data.nome_fornecedor = emit.getElementsByTagName("xNome")[0]?.textContent || '';
        }

        // Get Total data
        const total = xmlDoc.getElementsByTagName("total")[0];
        if (total) {
          const icmsTot = total.getElementsByTagName("ICMSTot")[0];
          if (icmsTot) {
            data.valor_total = parseFloat(icmsTot.getElementsByTagName("vNF")[0]?.textContent || 0);
            
            // Sum basic taxes for valor_impostos (ICMS + ST + IPI + PIS + COFINS)
            const vICMS = parseFloat(icmsTot.getElementsByTagName("vICMS")[0]?.textContent || 0);
            const vST = parseFloat(icmsTot.getElementsByTagName("vST")[0]?.textContent || 0);
            const vIPI = parseFloat(icmsTot.getElementsByTagName("vIPI")[0]?.textContent || 0);
            const vPIS = parseFloat(icmsTot.getElementsByTagName("vPIS")[0]?.textContent || 0);
            const vCOFINS = parseFloat(icmsTot.getElementsByTagName("vCOFINS")[0]?.textContent || 0);
            
            data.valor_impostos = vICMS + vST + vIPI + vPIS + vCOFINS;
          }
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsText(file);
  });
};