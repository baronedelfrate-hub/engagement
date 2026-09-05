import { addDays } from 'date-fns';

/**
 * Generates an array of installment payment records from a base payment.
 * @param {object} basePayload - The base data for the payment.
 * @param {number} valor_original - The total original value of the debt.
 * @param {string} data_vencimento - The due date for the first installment (YYYY-MM-DD).
 * @param {number} numero_parcelas - The total number of installments.
 * @param {number} intervalo_dias - The interval in days between installments.
 * @returns {Array<object>} An array of installment records ready for insertion.
 */
export const generateParcelaRecords = ({
  basePayload,
  valor_original,
  data_vencimento,
  numero_parcelas,
  intervalo_dias,
}) => {
  if (numero_parcelas <= 1) {
    return [{ 
      ...basePayload, 
      valor_original, 
      data_vencimento, 
      numero_parcelas: 1, 
      parcela_atual: 1,
      parcela_grupo_id: null,
      intervalo_dias: 30
    }];
  }

  const totalValue = parseFloat(valor_original);
  const numParcelas = parseInt(numero_parcelas, 10);
  const intervalo = parseInt(intervalo_dias, 10);
  const parcela_grupo_id = crypto.randomUUID();
  const dataVencimentoOriginal = data_vencimento;

  if (isNaN(totalValue) || isNaN(numParcelas) || numParcelas <= 0 || isNaN(intervalo)) {
    throw new Error('Valores inválidos para geração de parcelas.');
  }

  // Calculate installment value, ensuring cents are handled correctly
  const valorBaseParcela = Math.floor((totalValue * 100) / numParcelas) / 100;
  const valorTotalCalculado = valorBaseParcela * numParcelas;
  const diferenca = totalValue - valorTotalCalculado;

  const parcelas = [];
  const baseDate = new Date(`${data_vencimento}T12:00:00Z`); // Use UTC to avoid timezone shifts

  for (let i = 0; i < numParcelas; i++) {
    const valorParcela = (i === numParcelas - 1) ? valorBaseParcela + diferenca : valorBaseParcela;
    const dataVencimentoParcela = addDays(baseDate, i * intervalo);
    
    // Ensure the number in the title is padded for better sorting
    const paddedParcela = (i + 1).toString().padStart(2, '0');
    const paddedTotal = numParcelas.toString().padStart(2, '0');

    // Make a clean number for the installment (e.g. remove existing numbering if any)
    const baseNumero = basePayload.numero ? basePayload.numero.split('-PARC')[0] : 'CP';

    parcelas.push({
      ...basePayload,
      numero: `${baseNumero}-PARC${paddedParcela}`,
      valor_original: valorParcela.toFixed(2),
      data_vencimento: dataVencimentoParcela.toISOString().split('T')[0],
      numero_parcelas: numParcelas,
      parcela_atual: i + 1,
      parcela_grupo_id,
      data_vencimento_original: dataVencimentoOriginal,
      intervalo_dias: intervalo,
      parcelado: true,
      status: 'Pendente',
    });
  }

  return parcelas;
};