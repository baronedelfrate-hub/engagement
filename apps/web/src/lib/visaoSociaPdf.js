// Visão da Sócia em PDF (A4 paisagem): empresas, pessoa física e conferência, mês a mês.
import { MESES } from '@/lib/dreGerencial';
import { finalizarPdf } from '@/lib/pdfSaida';

const AZUL = [30, 58, 138]; const CINZA = [241, 245, 249]; const VERMELHO = [185, 28, 28]; const CINZA_TXT = [100, 100, 100];
const num = (v) => Number(v) || 0;
const fmt = (v) => { const n = num(v); return n === 0 ? '-' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const limpa = (t) => String(t || '').replace(/−/g, '-');

// dados: { ano, v (montarVisaoSocia) }
export const gerarVisaoSociaPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { ano, v } = dados;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const largura = doc.internal.pageSize.getWidth();
  const alturaPg = doc.internal.pageSize.getHeight();
  const margem = 8;

  doc.setFillColor(...AZUL); doc.rect(0, 0, largura, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('Visão da Sócia', margem, 9.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(v.pessoa.nome, margem, 14.5);
  doc.text(`Ano ${ano}  ·  Pessoa física e empresas juntas (regime de caixa, extrato classificado)`, margem, 19);
  doc.setTextColor(30, 30, 30);

  const meses = MESES.map((m) => `${m}/${String(ano).slice(2)}`);
  const celula = (x, extra = {}) => ({ content: fmt(x), styles: { halign: 'right', ...(num(x) < 0 ? { textColor: VERMELHO } : {}), ...extra } });
  const titulo = (t) => [{ content: limpa(t), colSpan: 14, styles: { fontStyle: 'bold', fillColor: [226, 232, 240], textColor: AZUL } }];
  const linha = (l, recuo = false, forte = false) => {
    const fundo = (l.destaque || forte) ? { fillColor: CINZA } : {};
    return [
      { content: limpa(l.rotulo), styles: { fontStyle: (l.destaque || forte) ? 'bold' : 'normal', ...fundo, ...(recuo ? { cellPadding: { top: 1.1, bottom: 1.1, left: 5, right: 1 } } : {}) } },
      ...l.valores.map((x) => celula(x, { fontStyle: l.destaque || forte ? 'bold' : 'normal', ...fundo })),
      celula(l.total, { fontStyle: 'bold', ...fundo })
    ];
  };
  const body = [];
  for (const e of v.empresas) {
    body.push(titulo(`Empresa: ${e.nome}${e.participacao != null ? ` (${e.participacao}%)` : ''}`));
    e.linhas.forEach((l) => body.push(linha(l, true)));
    body.push(linha(e.pago)); body.push(linha(e.aporte));
  }
  body.push(titulo(`Pessoa física: ${v.pessoa.nome}`));
  v.pf.rendimentos.forEach((l) => body.push(linha(l, true)));
  [v.pf.totalRendimentos, v.pf.gastos, v.pf.saldo, v.pf.aporteEmpresas, v.pf.foraOutros].forEach((l) => body.push(linha(l)));
  body.push(titulo('Conferência entre as empresas e o PF'));
  v.conferencia.forEach((l) => body.push(linha(l)));

  const larg = largura - margem * 2; const wConta = 60; const wTotal = 21; const wMes = (larg - wConta - wTotal) / 12;
  const colunas = { 0: { cellWidth: wConta }, 13: { cellWidth: wTotal } };
  for (let i = 1; i <= 12; i++) colunas[i] = { cellWidth: wMes };
  autoTable(doc, {
    startY: 27, head: [['Conta', ...meses, 'Total']], body, theme: 'plain', columnStyles: colunas,
    styles: { fontSize: 6.6, cellPadding: 1.1, lineColor: [226, 232, 240], lineWidth: 0.08, overflow: 'ellipsize' },
    headStyles: { fillColor: AZUL, textColor: 255, halign: 'center', fontSize: 7 },
    margin: { left: margem, right: margem, bottom: 14 }
  });
  const y = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(7); doc.setTextColor(...CINZA_TXT);
  const nota = doc.splitTextToSize('Vale só para o que já foi importado e classificado no extrato de cada cadastro. Diferença positiva em "pago - recebido" quer dizer que a empresa pagou mais do que aparece no PF: falta importar ou classificar o extrato pessoal, ou parte foi para outra conta.', largura - margem * 2);
  if (y + nota.length * 3 < alturaPg - 10) doc.text(nota, margem, y);

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, alturaPg - 5);
    doc.text(`Página ${i} de ${total}`, largura - margem, alturaPg - 5, { align: 'right' });
  }
  const slug = (v.pessoa.nome || 'socia').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
  return finalizarPdf(doc, `visao-socia_${slug}_${ano}.pdf`, opcoes);
};
