// Provisões: o que se espera pagar/receber antes de existir o lançamento real (movimentacao_financeira.provisao = true).

const dois = (n) => String(n).padStart(2, '0');

// Soma n meses a uma data yyyy-mm-dd mantendo o dia (31/01 + 1 mês = 28/02 ou 29/02)
export const somarMeses = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return `${alvo.getFullYear()}-${dois(alvo.getMonth() + 1)}-${dois(Math.min(d, ultimoDia))}`;
};

// Gera as linhas de provisão (uma por mês quando repete)
export const montarProvisoes = ({
  tipo, descricao, entidadeId, valor, dataPrevista, repetirMeses = 1,
  categoriaId, subcategoriaId, centroCustoId, observacoes, createdBy
}) => {
  const n = Math.max(1, Math.min(60, Number(repetirMeses) || 1));
  const hoje = new Date();
  const emissao = `${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}`;
  return Array.from({ length: n }, (_, k) => ({
    tipo,
    numero_titulo: `PROV · ${descricao.trim()}${n > 1 ? ` (${k + 1}/${n})` : ''}`,
    ...(tipo === 'receber' ? { cliente_id: entidadeId || null } : { fornecedor_id: entidadeId || null }),
    valor_total: Number(valor),
    data_emissao: emissao,
    data_vencimento: somarMeses(dataPrevista, k),
    categoria_id: categoriaId || null,
    subcategoria_id: subcategoriaId || null,
    centro_custo_id: centroCustoId || null,
    status: 'pendente',
    provisao: true,
    parcela_atual: k + 1,
    total_parcelas: n,
    observacoes: observacoes || null,
    ...(createdBy ? { created_by: createdBy } : {})
  }));
};
