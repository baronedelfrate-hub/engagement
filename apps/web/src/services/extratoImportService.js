import { supabase } from '@/lib/customSupabaseClient';

export const parseExtratoFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        
        if (file.name.toLowerCase().endsWith('.ofx')) {
          const transactions = parseOFXContent(text);
          resolve(transactions);
        } else if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.cfx')) {
          resolve([]); 
        } else {
          reject(new Error('Formato de arquivo não suportado. Use .OFX.'));
        }
      } catch (error) {
        reject(new Error(`Erro ao processar o conteúdo do arquivo: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Falha ao tentar ler o arquivo no navegador.'));
    };
    
    reader.readAsText(file);
  });
};

const parseOFXContent = (text) => {
  const transactions = [];
  const transRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const typeRegex = /<TRNTYPE>(.*?)(\r|\n|<)/;
  const dateRegex = /<DTPOSTED>(.*?)(\r|\n|<)/;
  const amtRegex = /<TRNAMT>(.*?)(\r|\n|<)/;
  const fitidRegex = /<FITID>(.*?)(\r|\n|<)/;
  const memoRegex = /<MEMO>(.*?)(\r|\n|<)/;

  let match;
  while ((match = transRegex.exec(text)) !== null) {
    const block = match[1];
    
    const type = (block.match(typeRegex) || [])[1]?.trim();
    const dateRaw = (block.match(dateRegex) || [])[1]?.trim();
    const amtRaw = (block.match(amtRegex) || [])[1]?.trim();
    const fitid = (block.match(fitidRegex) || [])[1]?.trim();
    const memo = (block.match(memoRegex) || [])[1]?.trim();

    if (dateRaw && amtRaw) {
      const date = `${dateRaw.substring(0,4)}-${dateRaw.substring(4,6)}-${dateRaw.substring(6,8)}`;
      
      transactions.push({
        data_transacao: date,
        descricao: memo || type || 'Transação Bancária',
        valor: parseFloat(amtRaw),
        numero_documento: fitid || '',
        tipo_transacao: type || ''
      });
    }
  }
  return transactions;
};

export const validateExtratoData = (data) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Nenhuma transação válida encontrada para importar.');
    }
    
    const validData = data.filter(item => item.data_transacao && !isNaN(item.valor));
    
    if (validData.length === 0) {
      throw new Error('Após validação, nenhuma transação restou para ser importada.');
    }
    
    return validData;
  } catch (error) {
    throw error;
  }
};

export const saveExtratoToDB = async (companyId, bancoId, transactions) => {
  try {
    const payloads = transactions.map(t => ({
      company_id: companyId,
      banco_id: bancoId,
      data_transacao: t.data_transacao,
      descricao: t.descricao,
      valor: t.valor,
      numero_documento: t.numero_documento,
      tipo_transacao: t.tipo_transacao,
      status_conciliacao: 'NÃO CONCILIADO'
    }));

    const { data, error } = await supabase
      .from('extrato_bancario')
      .insert(payloads)
      .select();

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Acesso negado: RLS ativo. Verifique CRITICAL_SUPABASE_RLS_INSTRUCTIONS.md');
      }
      
      if (error.code === '23505') {
        throw new Error('Erro: Algumas transações já existem no banco (duplicadas).');
      }
      
      throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);
    }

    return data;
    
  } catch (error) {
    throw error;
  }
};