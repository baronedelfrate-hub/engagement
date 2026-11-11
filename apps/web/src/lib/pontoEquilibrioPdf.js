// Ponto de Equilíbrio em PDF (A4 retrato): mês e acumulado, PE financeiro, gráfico receita x PE e detalhe por mês.
import { MESES } from '@/lib/dreGerencial';
import { finalizarPdf } from '@/lib/pdfSaida';
import { barrasVerticais } from '@/lib/relatorioMensalPdf';

const num = (v) => Number(v) || 0;
const fmt = (v) => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = (v) => `R$ ${fmt(v)}`;
const pct = (v) => `${(num(v) * 100).toFixed(1).replace('.', ',')}%`;
const AZUL = [30, 58, 138]; const CINZA = [241, 245, 249]; const AMBAR = [254, 243, 199];
const VERDE = [22, 163, 74]; const VERMELHO = [220, 38, 38]; const AZUL_CLARO = [59, 130, 246]; const LARANJA = [249, 115, 22];

// dados: { empresaNome, ano, mes, doMes, acumulado, meses: [{i,...calcularPEPeriodo}], incluirSocios, naoClassificado, filtros }
export const gerarPontoEquilibrioPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresaNome = '', ano, mes, doMes, acumulado, meses = [], incluirSocios = false, naoClassificado = 0, filtros = {} } = dados;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  doc.setFillColor(...AZUL); doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Ponto de Equilíbrio', margem, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(empresaNome, margem, 19);
  doc.setFontSize(8.5);
  doc.text(`${MESES[mes]}/${ano}  ·  Regime de caixa  ·  Banco: ${filtros.banco || 'Todos'}  ·  Obra: ${filtros.projeto || 'Todas'}  ·  Centro de custo: ${filtros.centro || 'Todos'}${incluirSocios ? '  ·  Com retiradas dos sócios nos custos fixos' : ''}`, margem, 24.5);
  doc.setTextColor(30, 30, 30);
  let y = 36;
  const garantir = (h) => { if (y + h > 275) { doc.addPage(); y = 18; } };
  const secao = (t) => { garantir(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AZUL); doc.text(t, margem, y); doc.setTextColor(30, 30, 30); y += 3; };
  const base = { styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: AZUL, textColor: 255 }, margin: { left: margem, right: margem } };
  const proximoY = () => { y = doc.lastAutoTable.finalY + 8; };

  if (Math.abs(num(naoClassificado)) > 0.5) {
    const aviso = `Atenção: há ${brl(Math.abs(naoClassificado))} em lançamentos de ${ano} ainda sem classificação. Eles ficam fora destes cálculos, então os custos podem estar subestimados e o ponto de equilíbrio real tende a ser maior.`;
    doc.setFontSize(8.5);
    const ls = doc.splitTextToSize(aviso, largura - margem * 2 - 6);
    const h = ls.length * 4 + 5;
    doc.setFillColor(...AMBAR); doc.rect(margem, y - 2, largura - margem * 2, h, 'F');
    doc.setTextColor(146, 64, 14); doc.text(ls, margem + 3, y + 2.5); doc.setTextColor(30, 30, 30);
    y += h + 6;
  }

  const situacao = (p) => {
    if (!p.temDado) return 'Sem movimento no período';
    if (p.peImpossivel) return 'Sem ponto de equilíbrio: a margem de contribuição é negativa';
    return `${brl(Math.abs(p.folga))} ${p.acima ? 'acima' : 'abaixo'} do ponto de equilíbrio (cobertura ${pct(p.cobertura)})`;
  };
  secao('1. Situação no mês e no acumulado');
  const col = (p) => [p.peImpossivel ? '-' : brl(p.pe), brl(p.receita), brl(p.fixos), brl(p.variaveis), pct(p.mcPct), brl(p.resultado), situacao(p)];
  const a = col(doMes); const b = col(acumulado);
  const rotulos = ['Ponto de equilíbrio', 'Receita bruta', 'Custos fixos', 'Custos variáveis', 'Margem de contribuição', 'Resultado (MC - fixos)', 'Situação'];
  autoTable(doc, {
    ...base, startY: y,
    head: [['Indicador', `${MESES[mes]}/${ano}`, `${MESES[0]} a ${MESES[mes]}/${ano}`]],
    body: rotulos.map((r, i) => [r, a[i], b[i]]),
    columnStyles: { 0: { cellWidth: 52 }, 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      if (d.row.index === 0) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; }
      if (d.row.index === 6 && d.column.index > 0) {
        const p = d.column.index === 1 ? doMes : acumulado;
        d.cell.styles.halign = 'left'; d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = p.temDado && !p.peImpossivel && p.acima ? VERDE : VERMELHO;
      }
      if (d.row.index === 5 && d.column.index > 0) { const p = d.column.index === 1 ? doMes : acumulado; if (p.resultado < 0) d.cell.styles.textColor = VERMELHO; }
    }
  });
  proximoY();
  if ((doMes.incluiuSocios && doMes.temDado) || (acumulado.incluiuSocios && acumulado.temDado)) {
    doc.setFontSize(8); doc.setTextColor(90, 90, 90);
    const t = `Os custos fixos incluem retiradas de sócios (${brl(doMes.retiradasSocios)} no mês; ${brl(acumulado.retiradasSocios)} no acumulado). Sem elas, o ponto de equilíbrio seria ${doMes.peImpossivel ? '-' : brl(doMes.peSemSocios)} no mês e ${acumulado.peImpossivel ? '-' : brl(acumulado.peSemSocios)} no acumulado.`;
    const ls = doc.splitTextToSize(t, largura - margem * 2);
    doc.text(ls, margem, y - 3); y += ls.length * 3.6; doc.setTextColor(30, 30, 30);
  }

  if (doMes.parcelasEmprestimos > 0 || acumulado.parcelasEmprestimos > 0) {
    secao('2. Ponto de equilíbrio financeiro');
    autoTable(doc, {
      ...base, startY: y,
      head: [['Indicador', `${MESES[mes]}/${ano}`, `${MESES[0]} a ${MESES[mes]}/${ano}`]],
      body: [
        ['Parcelas de empréstimos pagas (principal)', brl(doMes.parcelasEmprestimos), brl(acumulado.parcelasEmprestimos)],
        ['PE financeiro (custos fixos + parcelas)', doMes.peImpossivel ? '-' : brl(doMes.peFinanceiro), acumulado.peImpossivel ? '-' : brl(acumulado.peFinanceiro)],
        [doMes.acimaFinanceiro ? 'Acima do PE financeiro' : 'Abaixo do PE financeiro', doMes.peImpossivel ? '-' : brl(Math.abs(doMes.folgaFinanceira)), acumulado.peImpossivel ? '-' : brl(Math.abs(acumulado.folgaFinanceira))]
      ],
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
    });
    proximoY();
  }

  const comDado = meses.filter((m) => m.temDado);
  garantir(70);
  secao('3. Receita x ponto de equilíbrio, mês a mês');
  y += 4;
  doc.setFont('helvetica', 'normal');
  y += barrasVerticais(doc, {
    x: margem, y, w: largura - margem * 2, h: 42, rotulos: comDado.map((m) => MESES[m.i]),
    series: [
      { nome: 'Receita bruta', cor: AZUL_CLARO, valores: comDado.map((m) => m.receita) },
      { nome: 'Ponto de equilíbrio', cor: LARANJA, valores: comDado.map((m) => (m.peImpossivel ? 0 : m.pe)) }
    ]
  }) + 4;

  garantir(30);
  secao('4. Detalhe por mês');
  const linha = (nome, m) => [nome, fmt(m.receita), m.peImpossivel ? '-' : fmt(m.pe), m.peImpossivel ? '-' : `${m.acima ? '+' : '-'}${fmt(Math.abs(m.folga))}`, m.cobertura === null ? '-' : pct(m.cobertura)];
  autoTable(doc, {
    ...base, startY: y,
    head: [['Mês', 'Receita', 'Ponto de equilíbrio', 'Sobrou / faltou', 'Cobertura']],
    body: [...comDado.map((m) => linha(`${MESES[m.i]}/${String(ano).slice(2)}`, m)), linha('Acumulado', acumulado)],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const m = d.row.index < comDado.length ? comDado[d.row.index] : acumulado;
      if (d.column.index === 3) d.cell.styles.textColor = m.peImpossivel || !m.acima ? VERMELHO : VERDE;
      if (d.row.index === comDado.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; }
    }
  });

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, 290);
    doc.text(`Página ${i} de ${total}`, largura - margem, 290, { align: 'right' });
  }
  const slug = (empresaNome || 'empresa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
  return finalizarPdf(doc, `ponto-de-equilibrio_${slug}_${ano}-${String(mes + 1).padStart(2, '0')}.pdf`, opcoes);
};
