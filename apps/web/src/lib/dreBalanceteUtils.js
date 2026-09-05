import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0,00%';
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
};

export const calculateVariation = (current, previous) => {
  const amount = (current || 0) - (previous || 0);
  const percentage = previous ? (amount / Math.abs(previous)) * 100 : (current ? 100 : 0);
  return { amount, percentage };
};

export const calculateDRETotals = (dreData) => {
  if (!dreData || dreData.length === 0) return [];
  
  // Create a structured DRE based on raw data
  const dataMap = dreData.reduce((acc, curr) => {
    acc[curr.linha_dre] = curr;
    return acc;
  }, {});

  const getVal = (linha) => dataMap[linha]?.valor_atual || 0;
  const getPrev = (linha) => dataMap[linha]?.valor_anterior || 0;

  const receitas = getVal('1_RECEITAS');
  const deducoes = getVal('2_DEDUCOES');
  const receitaLiquida = receitas - deducoes;
  
  const custos = getVal('4_CUSTOS');
  const lucroBruto = receitaLiquida - custos;
  
  const despesasOp = getVal('6_DESPESAS_OPERACIONAIS');
  const resultadoOperacional = lucroBruto - despesasOp;
  
  const resultadoNaoOp = getVal('8_RESULTADO_NAO_OPERACIONAL');
  const resultadoAntesImposto = resultadoOperacional + resultadoNaoOp;
  
  const impostos = getVal('10_IMPOSTOS');
  const resultadoLiquido = resultadoAntesImposto - impostos;

  return [
    { ...dataMap['1_RECEITAS'], label: '1. RECEITAS BRUTAS', valor_atual: receitas, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('1_') && d.linha_dre !== '1_RECEITAS').map(d => ({ ...d, level: 1 })),
    { ...dataMap['2_DEDUCOES'], label: '2. DEDUÇÕES', valor_atual: deducoes, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('2_') && d.linha_dre !== '2_DEDUCOES').map(d => ({ ...d, level: 1 })),
    { label: '3. RECEITA LÍQUIDA', valor_atual: receitaLiquida, valor_anterior: getPrev('1_RECEITAS') - getPrev('2_DEDUCOES'), isTotal: true, level: 0 },
    { ...dataMap['4_CUSTOS'], label: '4. CUSTOS', valor_atual: custos, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('4_') && d.linha_dre !== '4_CUSTOS').map(d => ({ ...d, level: 1 })),
    { label: '5. LUCRO BRUTO', valor_atual: lucroBruto, valor_anterior: (getPrev('1_RECEITAS') - getPrev('2_DEDUCOES')) - getPrev('4_CUSTOS'), isTotal: true, level: 0 },
    { ...dataMap['6_DESPESAS_OPERACIONAIS'], label: '6. DESPESAS OPERACIONAIS', valor_atual: despesasOp, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('6_') && d.linha_dre !== '6_DESPESAS_OPERACIONAIS').map(d => ({ ...d, level: 1 })),
    { label: '7. RESULTADO OPERACIONAL', valor_atual: resultadoOperacional, valor_anterior: ((getPrev('1_RECEITAS') - getPrev('2_DEDUCOES')) - getPrev('4_CUSTOS')) - getPrev('6_DESPESAS_OPERACIONAIS'), isTotal: true, level: 0 },
    { ...dataMap['8_RESULTADO_NAO_OPERACIONAL'], label: '8. RESULTADO NÃO OPERACIONAL', valor_atual: resultadoNaoOp, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('8_') && d.linha_dre !== '8_RESULTADO_NAO_OPERACIONAL').map(d => ({ ...d, level: 1 })),
    { label: '9. RESULTADO ANTES DO IMPOSTO', valor_atual: resultadoAntesImposto, valor_anterior: (((getPrev('1_RECEITAS') - getPrev('2_DEDUCOES')) - getPrev('4_CUSTOS')) - getPrev('6_DESPESAS_OPERACIONAIS')) + getPrev('8_RESULTADO_NAO_OPERACIONAL'), isTotal: true, level: 0 },
    { ...dataMap['10_IMPOSTOS'], label: '10. IRPJ E CSLL', valor_atual: impostos, isHeader: true, level: 0 },
    ...dreData.filter(d => d.linha_dre.startsWith('10_') && d.linha_dre !== '10_IMPOSTOS').map(d => ({ ...d, level: 1 })),
    { label: '11. RESULTADO LÍQUIDO', valor_atual: resultadoLiquido, valor_anterior: ((((getPrev('1_RECEITAS') - getPrev('2_DEDUCOES')) - getPrev('4_CUSTOS')) - getPrev('6_DESPESAS_OPERACIONAIS')) + getPrev('8_RESULTADO_NAO_OPERACIONAL')) - getPrev('10_IMPOSTOS'), isGrandTotal: true, level: 0 }
  ];
};

export const validateBalancete = (balanceteData) => {
  if (!balanceteData) return { balanced: true, totalDebitos: 0, totalCreditos: 0, diferenca: 0 };
  
  const totalDebitos = balanceteData.reduce((acc, curr) => acc + (parseFloat(curr.debitos) || 0), 0);
  const totalCreditos = balanceteData.reduce((acc, curr) => acc + (parseFloat(curr.creditos) || 0), 0);
  const diferenca = Math.abs(totalDebitos - totalCreditos);
  
  return {
    balanced: diferenca < 0.01,
    totalDebitos,
    totalCreditos,
    diferenca
  };
};

export const exportDREToExcel = async (dreData, filename = 'DRE_Report.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DRE');

  worksheet.columns = [
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Valor Atual', key: 'valor_atual', width: 20 },
    { header: 'Valor Anterior', key: 'valor_anterior', width: 20 },
    { header: 'Variação (R$)', key: 'variacao_rs', width: 20 },
    { header: 'Variação (%)', key: 'variacao_pct', width: 15 }
  ];

  dreData.forEach(row => {
    const variation = calculateVariation(row.valor_atual, row.valor_anterior);
    const excelRow = worksheet.addRow({
      descricao: row.label || row.descricao,
      valor_atual: row.valor_atual || 0,
      valor_anterior: row.valor_anterior || 0,
      variacao_rs: variation.amount,
      variacao_pct: variation.percentage / 100
    });

    if (row.isTotal || row.isGrandTotal || row.isHeader) {
      excelRow.font = { bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

export const exportBalanceteToExcel = async (balanceteData, filename = 'Balancete_Report.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Balancete');

  worksheet.columns = [
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Conta', key: 'conta', width: 40 },
    { header: 'Saldo Anterior', key: 'saldo_anterior', width: 20 },
    { header: 'Débitos', key: 'debitos', width: 20 },
    { header: 'Créditos', key: 'creditos', width: 20 },
    { header: 'Saldo Final', key: 'saldo_final', width: 20 }
  ];

  balanceteData.forEach(row => {
    worksheet.addRow({
      codigo: row.conta?.codigo || row.conta_id,
      conta: row.conta?.nome || 'N/A',
      saldo_anterior: row.saldo_anterior || 0,
      debitos: row.debitos || 0,
      creditos: row.creditos || 0,
      saldo_final: row.saldo_final || 0
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};