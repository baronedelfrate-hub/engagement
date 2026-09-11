// Utilitários para formatação de datas.
//
// IMPORTANTE: colunas do tipo `date` no Postgres (sem componente de hora, ex: "2026-01-15")
// NÃO devem ser formatadas com `new Date(dateString).toLocaleDateString()`. O construtor
// `Date` do JS interpreta uma string "YYYY-MM-DD" como meia-noite UTC, e `toLocaleDateString()`
// converte para o timezone local do navegador. No Brasil (UTC-3), isso desloca a data exibida
// um dia para trás (ex: data_vencimento "2026-01-15" seria exibida como "14/01/2026").
//
// `formatDateOnly` evita esse bug construindo o `Date` a partir dos componentes locais
// (ano, mês, dia) diretamente, sem nunca interpretar a string como UTC.
//
// Use esta função apenas para colunas `date` (ex: data_vencimento, data_emissao, data_nascimento).
// Para colunas `timestamptz`/`timestamp` (ex: created_at, updated_at), continue usando
// `new Date(x).toLocaleDateString()` normalmente — esse é o comportamento correto para
// timestamps que representam um instante real no tempo.
export function formatDateOnly(dateStr, options) {
  if (!dateStr) return '-';
  const datePart = String(dateStr).split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return '-';
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', options);
}
