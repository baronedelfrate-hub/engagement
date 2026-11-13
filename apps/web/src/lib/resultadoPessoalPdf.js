// Resultado pessoal do mês em PDF (A4): resumo, gráficos, gastos por categoria e saldo no banco com o uso do limite.
import { MESES } from '@/lib/dreGerencial';
import { finalizarPdf } from '@/lib/pdfSaida';
import { barrasVerticais, barrasHorizontais, topComDemais } from '@/lib/relatorioMensalPdf';
import { textoLimite } from '@/lib/extratoConciliado';

const num = (v) => Number(v) || 0;
const fmt = (v) => { const n = num(v); const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return n < 0 ? `(${s})` : s; };
const AZUL = [30, 58, 138]; const CINZA = [241, 245, 249]; const AMBAR = [254, 243, 199];
const VERDE = [34, 197, 94]; const VERMELHO = [239, 68, 68]; const AZUL_CLARO = [59, 130, 246]; const LARANJA = [249, 115, 22];

export const gastosDoMes = (r, mes) => r.gastos.map((l) => ({ nome: l.rotulo, total: -l.valores[mes] })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

// dados: { empresa, ano, mes, r (montarResultadoPessoal), bancos [{nome,conta,saldo,limite}] }
export const gerarResultadoPessoalPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresa, ano, mes, r, bancos = [], porCentro = null } = dados;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  const tituloMes = `${MESES[mes]}/${ano}`;
  const nome = empresa?.nome_fantasia || empresa?.razao_social || '';

  doc.setFillColor(...AZUL); doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Resultado Pessoal', margem, 12);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`${nome}${empresa?.cnpj ? `  ·  CPF ${empresa.cnpj}` : ''}`, margem, 19);
  doc.text(`Competência: ${tituloMes}  ·  Regime de caixa (extrato bancário classificado)`, margem, 24);
  doc.setTextColor(30, 30, 30);
  let y = 36;

  const secao = (t) => { if (y > 255) { doc.addPage(); y = 18; } doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AZUL); doc.text(t, margem, y); doc.setTextColor(30, 30, 30); y += 3; };
  const proximoY = () => { y = doc.lastAutoTable.finalY + 9; };
  const garantir = (h) => { if (y + h > 275) { doc.addPage(); y = 18; } };
  const tituloGrafico = (t) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60); doc.text(t, margem, y); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30); };
  const base = { styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: AZUL, textColor: 255 }, margin: { left: margem, right: margem } };

  if (r.pendente.total !== 0) {
    const aviso = `Atenção: há lançamentos ainda sem classificação no ano (R$ ${fmt(Math.abs(r.pendente.total))}). Eles não entram nas entradas nem nos gastos até serem classificados.`;
    doc.setFontSize(8.5);
    const ls = doc.splitTextToSize(aviso, largura - margem * 2 - 6);
    const h = ls.length * 4 + 5;
    doc.setFillColor(...AMBAR); doc.rect(margem, y - 2, largura - margem * 2, h, 'F');
    doc.setTextColor(146, 64, 14); doc.text(ls, margem + 3, y + 2.5); doc.setTextColor(30, 30, 30);
    y += h + 6;
  }

  const acum = (o) => o.valores.slice(0, mes + 1).reduce((s, v) => s + v, 0);
  secao('1. Resumo do mês');
  autoTable(doc, {
    ...base, startY: y,
    head: [['Indicador', tituloMes, `Acumulado ${ano}`]],
    body: [
      ['Entradas', fmt(r.totalEntradas.valores[mes]), fmt(acum(r.totalEntradas))],
      ['Gastos', fmt(-r.totalGastos.valores[mes]), fmt(-acum(r.totalGastos))],
      ['Saldo do mês (entradas - gastos)', fmt(r.saldo.valores[mes]), fmt(acum(r.saldo))],
      ['Fora do saldo (investimentos, transferências, fatura)', fmt(r.totalFora.valores[mes]), fmt(acum(r.totalFora))],
      ['Movimentação líquida do caixa', fmt(r.caixa.valores[mes]), fmt(acum(r.caixa))]
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index === 2) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; } }
  });
  proximoY();

  if (bancos.length) {
    secao('2. Saldo no banco e limite');
    autoTable(doc, {
      ...base, startY: y,
      head: [['Conta', `Saldo em fim de ${tituloMes}`, 'Situação do limite']],
      body: bancos.map((b) => [`${b.nome}${b.conta ? ` · cc ${b.conta}` : ''}`, fmt(b.saldo), [b.saldo < 0 && b.limite > 0 ? `Limite em uso: ${textoLimite(b.saldo, b.limite).replace(/^usando /, '')}` : (textoLimite(b.saldo, b.limite) || (b.limite > 0 ? `Limite ${fmt(b.limite)} · disponível ${fmt(b.saldo + b.limite)}` : 'Saldo disponível')), b.semMovimento ? `Sem movimento no mês${b.origem === 'cadastro' ? ' (saldo cadastrado)' : ''}` : ''].filter(Boolean).join(' · ')]),
      columnStyles: { 1: { halign: 'right' } }
    });
    proximoY();
  }

  const ateMes = Array.from({ length: mes + 1 }, (_, i) => i);
  garantir(66);
  tituloGrafico(`Entradas x gastos — ${MESES[0]} a ${MESES[mes]}/${ano}`);
  y += 12;
  y += barrasVerticais(doc, {
    x: margem, y, w: largura - margem * 2, h: 42, rotulos: ateMes.map((i) => MESES[i]),
    series: [
      { nome: 'Entradas', cor: VERDE, valores: ateMes.map((i) => r.totalEntradas.valores[i]) },
      { nome: 'Gastos', cor: VERMELHO, valores: ateMes.map((i) => -r.totalGastos.valores[i]) },
      { nome: 'Saldo do mês', cor: AZUL_CLARO, valores: ateMes.map((i) => r.saldo.valores[i]) }
    ]
  }) + 4;

  const gastos = gastosDoMes(r, mes);
  garantir(30 + Math.min(gastos.length, 9) * 6.2);
  secao(`3. Para onde foi o dinheiro — ${tituloMes}`);
  y += 2;
  if (gastos.length) {
    y += barrasHorizontais(doc, { x: margem, y, w: largura - margem * 2, itens: topComDemais(gastos, 8).map((c) => ({ nome: c.nome, valor: c.total, resto: c.nome.startsWith('Demais') })), cor: LARANJA, corDestaque: LARANJA }) + 4;
  }
  const totalG = gastos.reduce((s, c) => s + c.total, 0);
  autoTable(doc, {
    ...base, startY: y,
    head: [['Categoria', `Gasto em ${tituloMes}`, '% dos gastos']],
    body: gastos.length ? [...gastos.map((c) => [c.nome, fmt(c.total), `${((c.total / totalG) * 100).toFixed(1).replace('.', ',')}%`]), ['TOTAL', fmt(totalG), '']] : [[{ content: 'Nenhum gasto no mês.', colSpan: 3 }]],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.raw?.[0] === 'TOTAL') d.cell.styles.fontStyle = 'bold'; }
  });
  proximoY();

  if (porCentro && porCentro.linhas.length) {
    garantir(30);
    secao(`4. Gastos por centro de custo — ${tituloMes}`);
    const nc = porCentro.colunas.length;
    autoTable(doc, {
      ...base, startY: y,
      head: [['Categoria', ...porCentro.colunas.map((c) => c.nome), 'Total']],
      body: [...porCentro.linhas.map((l) => [l.rotulo, ...porCentro.colunas.map((c) => fmt(l.porCentro[c.chave] || 0)), fmt(l.total)]), ['TOTAL', ...porCentro.colunas.map((c) => fmt(porCentro.totais[c.chave])), fmt(porCentro.total)]],
      columnStyles: Object.fromEntries(Array.from({ length: nc + 1 }, (_, i) => [i + 1, { halign: 'right' }])),
      styles: { fontSize: nc > 3 ? 7.5 : 8.5, cellPadding: 1.6 },
      didParseCell: (d) => { if (d.section === 'body' && d.row.raw?.[0] === 'TOTAL') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; } }
    });
    proximoY();
  }

  const entradas = r.entradas.map((l) => ({ nome: l.rotulo, total: l.valores[mes] })).filter((c) => c.total !== 0).sort((a, b) => b.total - a.total);
  if (entradas.length) {
    garantir(30);
    secao(`${porCentro && porCentro.linhas.length ? 5 : 4}. Entradas — ${tituloMes}`);
    autoTable(doc, { ...base, startY: y, head: [['Categoria', 'Valor']], body: [...entradas.map((c) => [c.nome, fmt(c.total)]), ['TOTAL', fmt(entradas.reduce((s, c) => s + c.total, 0))]], columnStyles: { 1: { halign: 'right' } }, didParseCell: (d) => { if (d.section === 'body' && d.row.raw?.[0] === 'TOTAL') d.cell.styles.fontStyle = 'bold'; } });
    proximoY();
  }

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, 290);
    doc.text(`Página ${i} de ${total}`, largura - margem, 290, { align: 'right' });
  }
  const arq = `resultado-pessoal_${(nome || 'pessoa').replace(/[^\w]+/g, '-').toLowerCase()}_${ano}-${String(mes + 1).padStart(2, '0')}.pdf`;
  return finalizarPdf(doc, arq, opcoes);
};
