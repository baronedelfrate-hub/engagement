import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { finalizarPdf } from '@/lib/pdfSaida';
import { moeda, fmtData, textoSaldos } from '@/lib/extratoConciliado';

const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const nomeArquivo = (empresa, banco, ext) => `Extrato_conciliado_${String(empresa || 'empresa').replace(/[^A-Za-z0-9]+/g, '_')}${banco ? `_${String(banco.nome).replace(/[^A-Za-z0-9]+/g, '_')}_${banco.conta || ''}` : ''}.${ext}`;

const COLUNAS = [
  ['Data', 11, (l) => fmtData(l.data)],
  ['Banco', 22, (l) => l.banco],
  ['Nº documento', 16, (l) => l.documento],
  ['Histórico do banco', 46, (l) => l.historico],
  ['Fornecedor / cliente', 34, (l) => l.contraparte],
  ['CPF / CNPJ', 20, (l) => l.cpfCnpj],
  ['Título', 34, (l) => l.titulo],
  ['Parcela', 9, (l) => l.parcela],
  ['Nota fiscal', 14, (l) => l.notaFiscal],
  ['Cód. categoria', 10, (l) => l.codigoCategoria],
  ['Categoria', 30, (l) => (l.classificado ? l.categoria : 'SEM CATEGORIA')],
  ['Subcategoria', 28, (l) => l.subcategoria],
  ['Centro de custo', 16, (l) => l.centroCusto],
  ['Obra / projeto', 22, (l) => l.obra],
  ['Observação', 40, (l) => l.observacao],
  ['Comprovante anexado', 26, (l) => (l.comprovante ? `Sim: ${l.comprovante}` : 'Não')],
  ['Situação', 14, (l) => (l.conciliado ? 'Conciliado' : 'Não conciliado')]
];

export const exportarExtratoExcel = async ({ empresa, filtros, linhas, resumo, banco }) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Extrato conciliado', { views: [{ state: 'frozen', ySplit: 6 }] });
  const total = COLUNAS.length + 3;
  ws.addRow([`Extrato conciliado — ${empresa}`]).font = { size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.addRow([filtros]).font = { italic: true, size: 10 };
  ws.addRow([`Emitido em ${fmtData(new Date().toISOString())}`]).font = { size: 9, color: { argb: 'FF666666' } };
  // linha 4: saldo bancário inicial e final; linha 5 em branco; o cabeçalho fica na linha 6
  const ts = textoSaldos(resumo);
  ws.addRow([ts.length ? ts.join('   |   ') : 'Saldo bancário: escolha um banco com saldo inicial cadastrado.']).font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };
  ws.addRow([]);
  const header = ws.getRow(6);
  [...COLUNAS.map((c) => c[0]), 'Entrada (R$)', 'Saída (R$)', 'Saldo (R$)'].forEach((t, i) => { header.getCell(i + 1).value = t; });
  header.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.alignment = { vertical: 'middle', wrapText: true }; });
  linhas.forEach((l, idx) => {
    const r = ws.getRow(7 + idx);
    COLUNAS.forEach((c, i) => { r.getCell(i + 1).value = c[2](l) || ''; });
    r.getCell(COLUNAS.length + 1).value = l.entrada || null;
    r.getCell(COLUNAS.length + 2).value = l.saida || null;
    r.getCell(COLUNAS.length + 3).value = l.saldo;
    [COLUNAS.length + 1, COLUNAS.length + 2, COLUNAS.length + 3].forEach((n) => { r.getCell(n).numFmt = BRL; });
    r.alignment = { vertical: 'top', wrapText: true };
    if (!l.classificado) r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    if (!l.conciliado) r.getCell(COLUNAS.length).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  });
  const fim = 7 + linhas.length;
  ws.getRow(fim).getCell(4).value = 'TOTAIS'; ws.getRow(fim).getCell(4).font = { bold: true };
  ws.getRow(fim).getCell(COLUNAS.length + 1).value = { formula: `SUM(${String.fromCharCode(64 + COLUNAS.length + 1)}7:${String.fromCharCode(64 + COLUNAS.length + 1)}${fim - 1})` };
  ws.getRow(fim).getCell(COLUNAS.length + 2).value = { formula: `SUM(${String.fromCharCode(64 + COLUNAS.length + 2)}7:${String.fromCharCode(64 + COLUNAS.length + 2)}${fim - 1})` };
  [COLUNAS.length + 1, COLUNAS.length + 2].forEach((n) => { ws.getRow(fim).getCell(n).numFmt = BRL; ws.getRow(fim).getCell(n).font = { bold: true }; });
  COLUNAS.forEach((c, i) => { ws.getColumn(i + 1).width = c[1]; });
  [COLUNAS.length + 1, COLUNAS.length + 2, COLUNAS.length + 3].forEach((n) => { ws.getColumn(n).width = 16; });
  ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: total } };

  const rs = wb.addWorksheet('Resumo por categoria');
  rs.addRow(['Resumo do extrato conciliado']).font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  rs.addRow([filtros]).font = { italic: true, size: 10 };
  rs.addRow([]);
  [['Lançamentos', resumo.qtd], ['Entradas', resumo.entradas], ['Saídas', resumo.saidas], ['Resultado do período', resumo.resultado],
    ['Saldo bancário inicial', resumo.saldoInicial], ['Saldo bancário final', resumo.saldoFinal], ['Sem categoria', resumo.semCategoria], ['Não conciliadas', resumo.naoConciliadas]]
    .forEach(([k, v]) => { const r = rs.addRow([k, v]); r.getCell(1).font = { bold: true }; if (typeof v === 'number' && !['Lançamentos', 'Sem categoria', 'Não conciliadas'].includes(k)) r.getCell(2).numFmt = BRL; });
  (resumo.saldos || []).filter((x) => x.inicial !== null).forEach((x) => { const r = rs.addRow([`${x.nome}${x.conta ? ` cc ${x.conta}` : ''}`, x.inicial, x.final]); r.getCell(2).numFmt = BRL; r.getCell(3).numFmt = BRL; });
  rs.addRow([]);
  const h = rs.addRow(['Categoria', 'Lançamentos', 'Entradas (R$)', 'Saídas (R$)']);
  h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
  resumo.porCategoria.forEach((c) => { const r = rs.addRow([c.categoria, c.qtd, c.entradas, c.saidas]); r.getCell(3).numFmt = BRL; r.getCell(4).numFmt = BRL; });
  rs.getColumn(1).width = 52; [2, 3, 4].forEach((n) => { rs.getColumn(n).width = 18; });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivo(empresa, banco, 'xlsx'));
};

export const exportarExtratoPdf = ({ empresa, filtros, linhas, resumo, banco }, opcoes = {}) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const W = doc.internal.pageSize.getWidth();
  doc.setFontSize(15); doc.setTextColor(30, 58, 138); doc.text(`Extrato conciliado — ${empresa}`, 28, 32);
  doc.setFontSize(9); doc.setTextColor(90, 90, 90); doc.text(`${filtros} · emitido em ${fmtData(new Date().toISOString())}`, 28, 46);
  doc.autoTable({
    startY: 54, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 138] },
    head: [['Entradas', 'Saídas', 'Resultado', 'Saldo bancário inicial', 'Saldo bancário final', 'Sem categoria', 'Não conciliadas']],
    body: [[moeda(resumo.entradas), moeda(resumo.saidas), moeda(resumo.resultado), resumo.saldoInicial === null ? (resumo.saldos?.length > 1 ? 'ver abaixo' : '—') : moeda(resumo.saldoInicial), resumo.saldoFinal === null ? (resumo.saldos?.length > 1 ? 'ver abaixo' : '—') : moeda(resumo.saldoFinal), String(resumo.semCategoria), String(resumo.naoConciliadas)]]
  });
  if ((resumo.saldos || []).length > 1) {
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 6, theme: 'plain', styles: { fontSize: 8 }, body: textoSaldos(resumo).map((t) => [t]) });
  }
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8, theme: 'striped', styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [30, 58, 138], fontSize: 7 },
    head: [['Data', 'Nº doc.', 'Histórico do banco', 'Fornecedor / cliente', 'Título / NF', 'Categoria', 'Centro / obra', 'Observação', 'Valor', 'Saldo', 'Sit.']],
    body: linhas.map((l) => [
      fmtData(l.data), l.documento, l.historico, [l.contraparte, l.cpfCnpj].filter(Boolean).join('\n'),
      [l.titulo, l.notaFiscal && `NF ${l.notaFiscal}`].filter(Boolean).join('\n'),
      l.classificado ? [l.codigoCategoria, l.categoria, l.subcategoria].filter(Boolean).join(' · ') : 'SEM CATEGORIA',
      [l.centroCusto, l.obra].filter(Boolean).join('\n'), l.observacao,
      moeda(l.valor), l.saldo === null ? '' : moeda(l.saldo), l.conciliado ? 'Conc.' : 'Pend.'
    ]),
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 42 }, 8: { halign: 'right', cellWidth: 56 }, 9: { halign: 'right', cellWidth: 56 }, 10: { cellWidth: 28 } },
    didParseCell: (d) => { if (d.section === 'body' && d.column.index === 5 && d.cell.raw === 'SEM CATEGORIA') d.cell.styles.textColor = [185, 28, 28]; }
  });
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 14, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 138] },
    head: [['Resumo por categoria', 'Lançamentos', 'Entradas', 'Saídas']],
    body: resumo.porCategoria.map((c) => [c.categoria, String(c.qtd), moeda(c.entradas), moeda(c.saidas)]),
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
  });
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${i} de ${n}`, W - 28, doc.internal.pageSize.getHeight() - 14, { align: 'right' }); }
  return finalizarPdf(doc, nomeArquivo(empresa, banco, 'pdf'), opcoes);
};
