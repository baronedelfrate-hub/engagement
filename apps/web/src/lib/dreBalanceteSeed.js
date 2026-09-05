import { supabase } from './customSupabaseClient';

export const insertSampleData = async (empresaId, competencia = '2023-10') => {
  try {
    const dreData = [
      { empresa_id: empresaId, competencia, linha_dre: '1_RECEITAS', descricao: 'Receitas Brutas', valor_atual: 150000, valor_anterior: 140000, ordem: 1 },
      { empresa_id: empresaId, competencia, linha_dre: '1_REC_PROD', descricao: 'Venda de Produtos', valor_atual: 100000, valor_anterior: 95000, ordem: 2 },
      { empresa_id: empresaId, competencia, linha_dre: '1_REC_SERV', descricao: 'Venda de Serviços', valor_atual: 50000, valor_anterior: 45000, ordem: 3 },
      { empresa_id: empresaId, competencia, linha_dre: '2_DEDUCOES', descricao: 'Deduções da Receita Bruta', valor_atual: 25000, valor_anterior: 22000, ordem: 4 },
      { empresa_id: empresaId, competencia, linha_dre: '2_DED_IMP', descricao: 'Impostos sobre Vendas', valor_atual: 20000, valor_anterior: 18000, ordem: 5 },
      { empresa_id: empresaId, competencia, linha_dre: '2_DED_DEV', descricao: 'Devoluções', valor_atual: 5000, valor_anterior: 4000, ordem: 6 },
      { empresa_id: empresaId, competencia, linha_dre: '4_CUSTOS', descricao: 'Custos (CPV/CSV)', valor_atual: 60000, valor_anterior: 58000, ordem: 7 },
      { empresa_id: empresaId, competencia, linha_dre: '4_CUS_PROD', descricao: 'Custo de Produtos Vendidos', valor_atual: 40000, valor_anterior: 38000, ordem: 8 },
      { empresa_id: empresaId, competencia, linha_dre: '4_CUS_SERV', descricao: 'Custo de Serviços Prestados', valor_atual: 20000, valor_anterior: 20000, ordem: 9 },
      { empresa_id: empresaId, competencia, linha_dre: '6_DESPESAS_OPERACIONAIS', descricao: 'Despesas Operacionais', valor_atual: 30000, valor_anterior: 28000, ordem: 10 },
      { empresa_id: empresaId, competencia, linha_dre: '6_DES_ADM', descricao: 'Despesas Administrativas', valor_atual: 15000, valor_anterior: 14000, ordem: 11 },
      { empresa_id: empresaId, competencia, linha_dre: '6_DES_VEN', descricao: 'Despesas com Vendas', valor_atual: 10000, valor_anterior: 9000, ordem: 12 },
      { empresa_id: empresaId, competencia, linha_dre: '6_DES_FIN', descricao: 'Despesas Financeiras', valor_atual: 5000, valor_anterior: 5000, ordem: 13 },
      { empresa_id: empresaId, competencia, linha_dre: '8_RESULTADO_NAO_OPERACIONAL', descricao: 'Resultado Não Operacional', valor_atual: 2000, valor_anterior: 1500, ordem: 14 },
      { empresa_id: empresaId, competencia, linha_dre: '10_IMPOSTOS', descricao: 'IRPJ e CSLL', valor_atual: 5000, valor_anterior: 4500, ordem: 15 }
    ];

    const { error: dreError } = await supabase.from('dre_dados').insert(dreData);
    if (dreError) console.error("Error inserting DRE data:", dreError);

    // Fetch some accounts or just use placeholders
    const { data: contas } = await supabase.from('contas_contabeis').select('id, codigo, nome').eq('empresa_id', empresaId).limit(5);
    
    if (contas && contas.length > 0) {
      const balanceteData = [
        { empresa_id: empresaId, competencia, conta_id: contas[0].id, saldo_anterior: 50000, debitos: 10000, creditos: 5000, saldo_final: 55000 },
        { empresa_id: empresaId, competencia, conta_id: contas[1]?.id || contas[0].id, saldo_anterior: 20000, debitos: 5000, creditos: 10000, saldo_final: 15000 }
      ];
      
      const { error: balError } = await supabase.from('balancete_dados').insert(balanceteData);
      if (balError) console.error("Error inserting Balancete data:", balError);
    }
    
    return true;
  } catch (err) {
    console.error("Failed to seed DRE/Balancete data", err);
    return false;
  }
};