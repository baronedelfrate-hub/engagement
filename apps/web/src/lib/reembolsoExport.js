import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { finalizarPdf } from '@/lib/pdfSaida';
import { moeda, fmtData } from '@/lib/extratoConciliado';
import { rotuloTipoPix, limparChavePix } from '@/lib/chavePix';

const slug = (s) => String(s || 'reembolso').replace(/[^A-Za-z0-9]+/g, '_');
const nomeArquivo = (r, ext) => `Reembolso_${String(r.numero || '').padStart(3, '0')}_${slug(r.beneficiario)}.${ext}`;
export const totalItens = (itens) => itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);

const lerImagem = (blob) => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = erro; fr.readAsDataURL(blob); });
const dimensoes = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok({ w: im.width, h: im.height }); im.onerror = () => ok(null); im.src = src; });

// imagens: { [itemId]: Blob } com os comprovantes que são fotos/imagens (entram no PDF, uma por página).
export const gerarReembolsoPdf = async ({ empresa, reembolso: r, itens, imagens = {} }, opcoes = {}) => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(16); doc.setTextColor(30, 58, 138); doc.text(`Relatório de reembolso nº ${String(r.numero || '').padStart(3, '0')}`, 40, 42);
  doc.setFontSize(9); doc.setTextColor(90, 90, 90); doc.text(`${empresa || ''} · emitido em ${fmtData(new Date().toISOString())}`, 40, 57);
  const pix = r.chave_pix ? `${rotuloTipoPix(r.tipo_chave_pix) ? `${rotuloTipoPix(r.tipo_chave_pix)}: ` : ''}${limparChavePix(r.tipo_chave_pix, r.chave_pix)}` : '—';
  doc.autoTable({
    startY: 68, theme: 'grid', styles: { fontSize: 9, cellPadding: 4 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 110, fillColor: [238, 242, 255] } },
    body: [['Beneficiário', r.beneficiario || ''], ['CPF / CNPJ', r.cpf_cnpj || '—'], ['Chave Pix', pix], ['Referência', r.referencia || '—'], ['Aprovador', r.aprovador || '—']]
  });
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 12, theme: 'striped', styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [30, 58, 138] },
    head: [['#', 'Data', 'Descrição', 'Categoria', 'Comprovante', 'Valor']],
    body: itens.map((i, n) => [n + 1, i.data ? fmtData(i.data) : '', i.descricao, i.categoria || '', i.comprovante_nome ? (imagens[i.id] ? `Anexo ${n + 1} (página seguinte)` : i.comprovante_nome) : 'Sem comprovante', moeda(i.valor)]),
    foot: [['', '', '', '', 'TOTAL A REEMBOLSAR', moeda(totalItens(itens))]],
    footStyles: { fillColor: [238, 242, 255], textColor: [30, 58, 138], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 52 }, 5: { halign: 'right', cellWidth: 70 } }
  });
  if (r.observacoes) {
    doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(`Observações: ${r.observacoes}`, W - 80), 40, doc.lastAutoTable.finalY + 18);
  }
  // linha de aprovação
  const yAss = Math.min(doc.lastAutoTable.finalY + (r.observacoes ? 70 : 60), H - 60);
  doc.setDrawColor(120); doc.line(40, yAss, 250, yAss); doc.line(W - 250, yAss, W - 40, yAss);
  doc.setFontSize(8); doc.setTextColor(100); doc.text('Solicitante', 40, yAss + 11); doc.text(`Aprovação${r.aprovador ? ` — ${r.aprovador}` : ''}`, W - 250, yAss + 11);

  for (let n = 0; n < itens.length; n += 1) {
    const i = itens[n]; const blob = imagens[i.id];
    if (!blob) continue;
    try {
      const src = await lerImagem(blob); const d = await dimensoes(src);
      if (!d) continue;
      doc.addPage();
      doc.setFontSize(10); doc.setTextColor(30, 58, 138); doc.text(`Anexo ${n + 1} — ${i.descricao} · ${moeda(i.valor)}`, 40, 36);
      const k = Math.min((W - 80) / d.w, (H - 90) / d.h);
      doc.addImage(src, blob.type?.includes('png') ? 'PNG' : 'JPEG', 40, 50, d.w * k, d.h * k);
    } catch (e) { /* imagem ilegível: segue sem a página do anexo */ }
  }
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${p} de ${total}`, W - 40, H - 16, { align: 'right' }); }
  return finalizarPdf(doc, nomeArquivo(r, 'pdf'), opcoes);
};

const BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
// Com itens vazios serve de modelo para o solicitante preencher.
export const gerarReembolsoExcel = async ({ empresa, reembolso: r, itens }) => {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Reembolso');
  ws.addRow([`Relatório de reembolso — ${empresa || ''}`]).font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  [['Beneficiário', r.beneficiario], ['CPF / CNPJ', r.cpf_cnpj], ['Chave Pix', limparChavePix(r.tipo_chave_pix, r.chave_pix)], ['Referência', r.referencia]].forEach(([k, v]) => { const x = ws.addRow([k, v || '']); x.getCell(1).font = { bold: true }; });
  ws.addRow([]);
  const h = ws.addRow(['Data', 'Descrição', 'Categoria', 'Valor (R$)', 'Comprovante']);
  h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
  const ini = h.number + 1;
  (itens.length ? itens : Array.from({ length: 15 }, () => ({}))).forEach((i) => { const x = ws.addRow([i.data ? fmtData(i.data) : '', i.descricao || '', i.categoria || '', i.valor ? Number(i.valor) : null, i.comprovante_nome || '']); x.getCell(4).numFmt = BRL; });
  const fim = ws.rowCount; const t = ws.addRow(['', '', 'TOTAL', { formula: `SUM(D${ini}:D${fim})` }]); t.font = { bold: true }; t.getCell(4).numFmt = BRL;
  [12, 48, 24, 16, 36].forEach((w, n) => { ws.getColumn(n + 1).width = w; });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivo({ ...r, numero: r.numero }, 'xlsx'));
};
