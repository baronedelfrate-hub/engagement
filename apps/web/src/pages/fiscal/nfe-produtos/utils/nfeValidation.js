export const calculateTotals = (items) => {
  let subtotal = 0;
  let total_descontos = 0;
  let total_impostos = 0;

  items.forEach(item => {
    const qty = parseFloat(item.quantidade) || 0;
    const price = parseFloat(item.valor_unitario) || 0;
    const desc = parseFloat(item.desconto) || 0;
    const tax = parseFloat(item.impostos) || 0;

    subtotal += (qty * price);
    total_descontos += desc;
    total_impostos += tax;
  });

  const valor_total = (subtotal - total_descontos) + total_impostos;

  return {
    subtotal: Math.max(0, subtotal),
    total_descontos: Math.max(0, total_descontos),
    total_impostos: Math.max(0, total_impostos),
    valor_total: Math.max(0, valor_total)
  };
};

export const validateNfeData = (data) => {
  const errors = [];
  if (!data.empresa_id) errors.push('Empresa emitente é obrigatória.');
  if (!data.cliente_id) errors.push('Cliente é obrigatório.');
  if (!data.data_emissao) errors.push('Data de emissão é obrigatória.');
  if (!data.natureza_operacao) errors.push('Natureza da operação é obrigatória.');
  return errors;
};

export const validateProducts = (items) => {
  const errors = [];
  if (!items || items.length === 0) {
    errors.push('Adicione pelo menos um produto.');
    return errors;
  }
  items.forEach((item, idx) => {
    if (!item.produto_id) errors.push(`Produto não selecionado na linha ${idx + 1}.`);
    if (!item.quantidade || item.quantidade <= 0) errors.push(`Quantidade inválida na linha ${idx + 1}.`);
    if (item.valor_unitario < 0) errors.push(`Valor unitário inválido na linha ${idx + 1}.`);
  });
  return errors;
};