export const calculateMargin = (precoVenda, precoCusto) => {
  if (!precoVenda || precoVenda <= 0) return 0;
  const custo = precoCusto || 0;
  return ((precoVenda - custo) / precoVenda) * 100;
};

export const calculateMarkup = (precoVenda, precoCusto) => {
  if (!precoCusto || precoCusto <= 0) return 0;
  const venda = precoVenda || 0;
  return ((venda - precoCusto) / precoCusto) * 100;
};

export const calculateAverageCost = (costsArray) => {
  if (!costsArray || costsArray.length === 0) return 0;
  const sum = costsArray.reduce((acc, curr) => acc + curr, 0);
  return sum / costsArray.length;
};

export const validateNCM = (ncm) => {
  if (!ncm) return true; // Optional, but if present must be valid
  // Remove dots/spaces
  const cleanNCM = ncm.replace(/\D/g, '');
  return cleanNCM.length === 8;
};

export const validateEAN = (barcode) => {
  if (!barcode) return true; // Optional
  const cleanCode = barcode.replace(/\D/g, '');
  // Basic length check for EAN-8, EAN-13, EAN-14, GTIN
  return [8, 12, 13, 14].includes(cleanCode.length);
};

export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatBarcode = (value) => {
  if (!value) return '';
  return value.replace(/[^0-9]/g, '');
};

export const validateRequiredFields = (produto) => {
  const errors = {};
  
  if (!produto.nome) errors.nome = "Nome é obrigatório";
  if (!produto.tipo) errors.tipo = "Tipo do produto é obrigatório";
  if (!produto.unidade_medida) errors.unidade_medida = "Unidade de medida é obrigatória";
  if (!produto.preco_venda || produto.preco_venda <= 0) errors.preco_venda = "Preço de venda deve ser maior que zero";
  
  // Tab 2 requirements
  if (!produto.centro_custo_id) errors.centro_custo_id = "Centro de custo é obrigatório";
  if (!produto.conta_receita_id) errors.conta_receita_id = "Conta de receita é obrigatória";

  // Unique checks logic typically happens in the service/form, not just utility validation
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};