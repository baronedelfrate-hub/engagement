// Orçamento e resultado pessoal (cadastros de pessoa física): entradas, gastos por categoria, saldo do mês
// e o que fica fora do saldo (investimentos, transferências, fatura de cartão, aportes às empresas).
// Regime de caixa, a partir do extrato classificado. Entradas positivas, saídas negativas.
import { compararCodigos } from '@/lib/planoContas';

const zeros = () => Array(12).fill(0);
const soma = (a) => a.reduce((s, v) => s + v, 0);
const arred = (v) => Math.round(v * 100) / 100;
const SECOES = { pf_entrada: 'entradas', pf_gasto: 'gastos', pf_fora: 'fora' };

// movs: [{ data_transacao 'yyyy-mm-dd', valor, categoria_id, subcategoria_id }]
export const montarResultadoPessoal = (movs, { ano, categorias, subcategorias }) => {
  const catPorId = new Map(categorias.map((c) => [c.id, c]));
  const subPorId = new Map(subcategorias.map((s) => [s.id, s]));

  const secoes = { entradas: new Map(), gastos: new Map(), fora: new Map() };
  for (const c of categorias.filter((x) => SECOES[x.grupo_dre]).sort((a, b) => compararCodigos(a.codigo || '0', b.codigo || '0'))) {
    secoes[SECOES[c.grupo_dre]].set(c.id, { chave: c.id, rotulo: `${c.codigo ? `${c.codigo} ` : ''}${c.nome}`, valores: zeros(), detalhes: new Map() });
  }
  const naoClass = { chave: 'nao_classificado', rotulo: 'Ainda não classificado (pendente de revisão)', valores: zeros(), detalhes: new Map() };

  for (const m of movs) {
    if (!m.data_transacao || Number(m.data_transacao.slice(0, 4)) !== ano) continue;
    const mes = Number(m.data_transacao.slice(5, 7)) - 1;
    const valor = Number(m.valor) || 0;
    const cat = catPorId.get(m.categoria_id);
    const sec = cat && SECOES[cat.grupo_dre];
    const linha = sec ? secoes[sec].get(cat.id) : naoClass;
    linha.valores[mes] += valor;
    const sub = subPorId.get(m.subcategoria_id);
    const chaveDet = sub ? sub.id : 'sem';
    const rotuloDet = sub ? `${sub.codigo || ''} ${sub.nome}`.trim() : 'Sem subcategoria';
    if (!linha.detalhes.has(chaveDet)) linha.detalhes.set(chaveDet, { id: chaveDet, rotulo: rotuloDet, valores: zeros() });
    linha.detalhes.get(chaveDet).valores[mes] += valor;
  }

  const fecha = (l) => ({
    ...l, valores: l.valores.map(arred), total: arred(soma(l.valores)),
    detalhes: [...l.detalhes.values()].map((d) => ({ ...d, valores: d.valores.map(arred), total: arred(soma(d.valores)) })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true }))
  });
  const total = (linhas) => { const v = zeros().map((_, i) => arred(linhas.reduce((s, l) => s + l.valores[i], 0))); return { valores: v, total: arred(soma(v)) }; };

  const entradas = [...secoes.entradas.values()].map(fecha);
  const gastos = [...secoes.gastos.values()].map(fecha);
  const fora = [...secoes.fora.values()].map(fecha);
  const pendente = fecha(naoClass);
  const totalEntradas = total(entradas);
  const totalGastos = total(gastos);
  const saldo = { valores: totalEntradas.valores.map((v, i) => arred(v + totalGastos.valores[i])), total: arred(totalEntradas.total + totalGastos.total) };
  const totalFora = total(fora);
  // o que realmente aconteceu no caixa: saldo + o que ficou fora do saldo + o que ainda não foi classificado
  const caixa = { valores: saldo.valores.map((v, i) => arred(v + totalFora.valores[i] + pendente.valores[i])), total: arred(saldo.total + totalFora.total + pendente.total) };
  return { ano, entradas, gastos, fora, pendente, totalEntradas, totalGastos, saldo, totalFora, caixa };
};
