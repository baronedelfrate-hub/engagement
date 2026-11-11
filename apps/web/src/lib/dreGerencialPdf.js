// DRE gerencial mensal em PDF (A4 paisagem): contas x 12 meses + total, com as subcontas e o resultado de caixa.
import { MESES } from '@/lib/dreGerencial';
import { finalizarPdf } from '@/lib/pdfSaida';

const AZUL = [30, 58, 138]; const CINZA = [241, 245, 249]; const VERMELHO = [185, 28, 28]; const CINZA_TXT = [100, 100, 100]; const VERDE = [236, 253, 245];
const num = (v) => Number(v) || 0;
const fmt = (v) => { const n = num(v); return n === 0 ? '-' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const limpa = (t) => String(t || '').replace(/−/g, '-'); // a fonte do PDF não tem o sinal de menos tipográfico

// dados: { empresaNome, ano, dre (montarDRE), retiradasComoDespesa, filtros: { banco, projeto, centro } }
export const gerarDreGerencialPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresaNome = '', ano, dre, retiradasComoDespesa = false, filtros = {} } = dados;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const largura = doc.internal.pageSize.getWidth();
  const alturaPg = doc.internal.pageSize.getHeight();
  const margem = 8;

  doc.setFillColor(...AZUL); doc.rect(0, 0, largura, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('DRE Gerencial', margem, 9.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(empresaNome, margem, 14.5);
  const partes = [`Ano ${ano}`, 'Regime de caixa (extrato bancário classificado)', `Banco: ${filtros.banco || 'Todos'}`, `Obra: ${filtros.projeto || 'Todas'}`, `Centro de custo: ${filtros.centro || 'Todos'}`];
  if (retiradasComoDespesa) partes.push('Retiradas dos sócios na remuneração (despesas)');
  doc.text(partes.join('  ·  '), margem, 19);
  doc.setTextColor(30, 30, 30);

  const meses = MESES.map((m) => `${m}/${String(ano).slice(2)}`);
  const head = [['Conta', ...meses, 'Total']];
  const celula = (v, extra = {}) => ({ content: fmt(v), styles: { halign: 'right', ...(num(v) < 0 ? { textColor: VERMELHO } : {}), ...extra } });
  const body = [];
  let cabecalhoFora = false;
  for (const l of dre.linhas) {
    const sub = l.tipo === 'subtotal';
    if (!sub && l.tipo !== 'grupo' && l.total === 0 && l.valores.every((v) => v === 0)) continue;
    if ((l.tipo === 'fora' || l.tipo === 'neutro') && !cabecalhoFora) { cabecalhoFora = true; body.push([{ content: 'FORA DA DRE', colSpan: 14, styles: { fontStyle: 'bold', textColor: CINZA_TXT, fontSize: 6.5 } }]); }
    const fundo = sub ? { fillColor: CINZA } : {};
    body.push([{ content: limpa(l.rotulo), styles: { fontStyle: 'bold', ...fundo } }, ...l.valores.map((v) => celula(v, { fontStyle: sub ? 'bold' : 'normal', ...fundo })), celula(l.total, { fontStyle: 'bold', ...fundo })]);
    for (const d of l.detalhes) {
      if (d.total === 0 && d.valores.every((v) => v === 0)) continue;
      body.push([
        { content: limpa(d.rotulo), styles: { fontSize: 6, textColor: CINZA_TXT, cellPadding: { top: 0.7, bottom: 0.7, left: 4, right: 1 } } },
        ...d.valores.map((v) => celula(v, { fontSize: 6 })), celula(d.total, { fontSize: 6 })
      ]);
    }
  }
  // resultado de caixa (tabela própria, para não quebrar no meio entre duas páginas)
  const bodyCaixa = [];
  for (const l of dre.caixa.linhas) {
    bodyCaixa.push([{ content: limpa(l.rotulo), styles: { fontStyle: l.chave === 'lucro_liquido' ? 'bold' : 'normal' } }, ...l.valores.map((v) => celula(v)), celula(l.total, { fontStyle: 'bold' })]);
  }
  bodyCaixa.push([{ content: '= GERAÇÃO DE CAIXA DO MÊS', styles: { fontStyle: 'bold', fillColor: VERDE } }, ...dre.caixa.geracao.valores.map((v) => celula(v, { fontStyle: 'bold', fillColor: VERDE })), celula(dre.caixa.geracao.total, { fontStyle: 'bold', fillColor: VERDE })]);

  const larg = largura - margem * 2;
  const wConta = 58;
  const wTotal = 21;
  const wMes = (larg - wConta - wTotal) / 12;
  const colunas = { 0: { cellWidth: wConta }, 13: { cellWidth: wTotal } };
  for (let i = 1; i <= 12; i++) colunas[i] = { cellWidth: wMes };
  const estilo = {
    theme: 'plain', columnStyles: colunas,
    styles: { fontSize: 6.6, cellPadding: 1.1, lineColor: [226, 232, 240], lineWidth: 0.08, overflow: 'ellipsize' },
    headStyles: { fillColor: AZUL, textColor: 255, halign: 'center', fontSize: 7 },
    margin: { left: margem, right: margem, bottom: 12 }
  };
  autoTable(doc, { ...estilo, startY: 27, head, body });
  let y = doc.lastAutoTable.finalY + 6;
  const alturaCaixa = 9 + (bodyCaixa.length + 1) * 5.2;
  if (y + alturaCaixa > alturaPg - 12) { doc.addPage(); y = 14; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AZUL);
  doc.text('Resultado de caixa', margem, y); doc.setTextColor(30, 30, 30);
  autoTable(doc, { ...estilo, startY: y + 2, head: [['Do lucro à geração de caixa', ...meses, 'Total']], body: bodyCaixa });

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, alturaPg - 5);
    doc.text(`Página ${i} de ${total}`, largura - margem, alturaPg - 5, { align: 'right' });
  }
  const slug = (empresaNome || 'empresa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
  return finalizarPdf(doc, `dre-gerencial_${slug}_${ano}.pdf`, opcoes);
};
