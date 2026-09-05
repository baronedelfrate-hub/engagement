import { NotaFiscalLogger } from './notaFiscalLogger';

const getXMLText = (parent, tagName, defaultValue = "") => {
  if (!parent) return defaultValue;
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0 && elements[0].textContent) {
      return elements[0].textContent.trim();
  }
  return defaultValue;
};

export const XmlParsingService = {
  parseNFe(xmlString) {
    NotaFiscalLogger.info('XML_PARSE_START', { length: xmlString.length });
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("XML malformado ou inválido.");
      }

      const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
      if (!infNFe) {
        throw new Error("Tag <infNFe> não encontrada. Não é um XML de NFe válido.");
      }

      const ide = xmlDoc.getElementsByTagName("ide")[0];
      const emit = xmlDoc.getElementsByTagName("emit")[0];
      const total = xmlDoc.getElementsByTagName("ICMSTot")[0];
      
      // Extract basic fields
      const numero = getXMLText(ide, "nNF");
      const serie = getXMLText(ide, "serie");
      const data_emissao = getXMLText(ide, "dhEmi");
      
      // Attempt to find due date in cobr/dup
      const dup = xmlDoc.getElementsByTagName("dup")[0];
      const data_vencimento = getXMLText(dup, "dVenc", data_emissao.split('T')[0]); 

      const emitente_cnpj = getXMLText(emit, "CNPJ");
      const emitente_nome = getXMLText(emit, "xNome");
      const valor_total = parseFloat(getXMLText(total, "vNF", "0"));

      // Extract items
      const items = Array.from(xmlDoc.getElementsByTagName("det")).map((det, index) => {
        const prod = det.getElementsByTagName("prod")[0];
        return {
            codigo: getXMLText(prod, "cProd", `ITEM${index}`),
            descricao: getXMLText(prod, "xProd", "Item Sem Nome"),
            quantidade: parseFloat(getXMLText(prod, "qCom", "0")),
            valor_unitario: parseFloat(getXMLText(prod, "vUnCom", "0")),
            valor_total: parseFloat(getXMLText(prod, "vProd", "0")),
        };
      });

      const result = {
        numero,
        serie,
        data_emissao,
        data_vencimento,
        emitente_cnpj,
        emitente_nome,
        valor_total,
        itens: items
      };

      // Validation
      if (!numero || !emitente_cnpj || valor_total <= 0) {
        NotaFiscalLogger.warn('XML_PARSE_VALIDATION_WARNING', { result });
      } else {
        NotaFiscalLogger.info('XML_PARSE_SUCCESS', { numero, emitente_cnpj, valor_total, itensCount: items.length });
      }

      return result;

    } catch (error) {
      NotaFiscalLogger.error('XML_PARSE_ERROR', { error: error.message, stack: error.stack });
      throw error;
    }
  }
};