/**
 * Formats a CNPJ string into XX.XXX.XXX/XXXX-XX
 * @param {string} value 
 * @returns {string}
 */
export const formatCnpj = (value) => {
  if (!value) return '';
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

/**
 * Removes all non-numeric characters from CNPJ
 * @param {string} value 
 * @returns {string}
 */
export const unformatCnpj = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

/**
 * Validates CNPJ format and check digits
 * @param {string} cnpj 
 * @returns {boolean}
 */
export const isCnpjValid = (cnpj) => {
  if (!cnpj) return false;

  const numbers = unformatCnpj(cnpj);

  if (numbers.length !== 14) return false;

  // Eliminate known invalid CNPJs (repeating numbers)
  if (/^(\d)\1+$/.test(numbers)) return false;

  // Validate check digits
  const calcDigit = (doc, factors) => {
    let sum = 0;
    for (let i = 0; i < doc.length; i++) {
      sum += parseInt(doc[i]) * factors[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstFactors = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondFactors = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcDigit(numbers.substring(0, 12), firstFactors);
  const digit2 = calcDigit(numbers.substring(0, 12) + digit1, secondFactors);

  return (
    digit1 === parseInt(numbers.charAt(12)) && 
    digit2 === parseInt(numbers.charAt(13))
  );
};