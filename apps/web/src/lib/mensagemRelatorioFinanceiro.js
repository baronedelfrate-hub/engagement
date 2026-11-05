// Texto de abertura do relatório de contas a pagar/receber enviado por WhatsApp (o mesmo na tela da empresa e no Disparo de Resultados).
const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const mensagemRelatorioFinanceiro = ({ source, periodo, linhas }) => {
  const pagar = source === 'CONTAS_PAGAR';
  const total = (linhas || []).reduce((s, r) => s + Number(r.valor_original || 0), 0);
  return `Olá! Tudo bem?\n\nSegue o relatório de *${pagar ? 'contas a pagar' : 'contas a receber'}*${periodo ? ` (${periodo})` : ''}.\n\nRegistros: *${(linhas || []).length}*\nValor total: *${moeda(total)}*\n\nO PDF traz o detalhamento e os resumos por dia, ${pagar ? 'fornecedor' : 'cliente'}, categoria e centro de custo.`;
};

// Pergunta e texto do bloco de pagamentos (valor e chave Pix / boleto), igual nas duas telas.
export const blocoPagamentosDoRelatorio = (textoPagamentos, itens) => ({
  pergunta: 'Colocar na mensagem o valor e a chave Pix (ou o código do boleto) de cada pagamento?',
  ajuda: 'Útil quando você não tem senha de operador e a própria pessoa lança o pagamento no banco: cada chave vem sozinha em uma linha, para copiar com um toque. Só entram os pagamentos ainda em aberto.',
  texto: textoPagamentos, itens
});
