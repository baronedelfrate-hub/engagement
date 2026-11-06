import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/lib/customSupabaseClient';
import { finalizarPdf } from '@/lib/pdfSaida';

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const num = (c) => { const n = parseFloat(String(c ?? '').replace(',', '.')); return Number.isNaN(n) ? Infinity : n; };
const porCodigo = (a, b) => (num(a.codigo) - num(b.codigo)) || String(a.codigo ?? '').localeCompare(String(b.codigo ?? ''), 'pt-BR', { numeric: true }) || String(a.nome).localeCompare(String(b.nome), 'pt-BR');

// Categorias com suas subcategorias, e centros de custo, de uma empresa.
export const carregarPlanoContas = async (empresaId, { incluirInativos = false } = {}) => {
  const [cat, sub, cc] = await Promise.all([
    supabase.from('categorias').select('id, codigo, nome, descricao, ativo, ordem').eq('company_id', empresaId).then(ok),
    supabase.from('subcategorias').select('id, categoria_id, codigo, nome, descricao, ativo').eq('company_id', empresaId).then(ok),
    supabase.from('centros_custo').select('id, codigo, nome, descricao, ativo').eq('company_id', empresaId).then(ok)
  ]);
  const vivo = (x) => incluirInativos || x.ativo !== false;
  const subs = sub.filter(vivo);
  const categorias = cat.filter(vivo).sort((a, b) => ((a.ordem ?? 9999) - (b.ordem ?? 9999)) || porCodigo(a, b))
    .map((c) => ({ ...c, subcategorias: subs.filter((s) => s.categoria_id === c.id).sort(porCodigo) }));
  return { categorias, centros: cc.filter(vivo).sort(porCodigo) };
};

const slug = (s) => String(s || 'empresa').replace(/[^A-Za-z0-9]+/g, '_');
const nomeArquivo = (empresa, ext) => `Plano_de_contas_${slug(empresa)}.${ext}`;
const hoje = () => new Date().toLocaleDateString('pt-BR');

export const gerarPlanoContasPdf = ({ empresa, plano }, opcoes = {}) => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(16); doc.setTextColor(30, 58, 138); doc.text('Plano de contas e centros de custo', 40, 42);
  doc.setFontSize(10); doc.setTextColor(90, 90, 90); doc.text(`${empresa} · emitido em ${hoje()}`, 40, 57);
  const nSub = plano.categorias.reduce((s, c) => s + c.subcategorias.length, 0);
  doc.setFontSize(9); doc.text(`${plano.categorias.length} categorias · ${nSub} subcategorias · ${plano.centros.length} centros de custo`, 40, 70);

  const corpo = [];
  plano.categorias.forEach((c) => {
    corpo.push([{ content: c.codigo ?? '', styles: { fontStyle: 'bold', fillColor: [238, 242, 255] } }, { content: c.nome, styles: { fontStyle: 'bold', fillColor: [238, 242, 255] } }, { content: c.descricao || '', styles: { fillColor: [238, 242, 255], fontSize: 7 } }]);
    c.subcategorias.forEach((s) => corpo.push([s.codigo ?? '', { content: `    ${s.nome}`, styles: {} }, { content: s.descricao || '', styles: { fontSize: 7, textColor: [100, 100, 100] } }]));
  });
  doc.autoTable({
    startY: 82, theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' }, headStyles: { fillColor: [30, 58, 138] },
    head: [['Código', 'Categoria / subcategoria', 'Descrição']], body: corpo,
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 230 } }
  });
  let y = doc.lastAutoTable.finalY + 22;
  if (y + 60 > H - 40) { doc.addPage(); y = 40; }
  doc.setFontSize(12); doc.setTextColor(30, 58, 138); doc.text('Centros de custo', 40, y);
  doc.autoTable({
    startY: y + 8, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [30, 58, 138] },
    head: [['Código', 'Centro de custo', 'Descrição']],
    body: plano.centros.length ? plano.centros.map((c) => [c.codigo ?? '', c.nome, c.descricao || '']) : [['', 'Esta empresa não tem centros de custo cadastrados.', '']],
    columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 230 } }
  });
  const n = doc.internal.getNumberOfPages();
  for (let p = 1; p <= n; p += 1) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${p} de ${n}`, W - 40, H - 16, { align: 'right' }); }
  return finalizarPdf(doc, nomeArquivo(empresa, 'pdf'), opcoes);
};

export const gerarPlanoContasExcel = async ({ empresa, plano }) => {
  const wb = new ExcelJS.Workbook();
  const cab = (ws, cols) => { const h = ws.addRow(cols.map((c) => c[0])); h.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; }); cols.forEach((c, i) => { ws.getColumn(i + 1).width = c[1]; }); };
  const ws = wb.addWorksheet('Categorias e subcategorias', { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.addRow([`Plano de contas — ${empresa}`]).font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.addRow([`Emitido em ${hoje()}`]).font = { size: 9, color: { argb: 'FF666666' } };
  cab(ws, [['Código', 12], ['Categoria', 40], ['Subcategoria', 50], ['Descrição', 60]]);
  plano.categorias.forEach((c) => {
    const r = ws.addRow([c.codigo ?? '', c.nome, '', c.descricao || '']); r.font = { bold: true }; r.eachCell((x) => { x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }; });
    c.subcategorias.forEach((s) => ws.addRow([s.codigo ?? '', c.nome, s.nome, s.descricao || '']));
  });
  const wc = wb.addWorksheet('Centros de custo');
  wc.addRow([`Centros de custo — ${empresa}`]).font = { size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  wc.addRow([]);
  cab(wc, [['Código', 12], ['Centro de custo', 40], ['Descrição', 70]]);
  plano.centros.forEach((c) => wc.addRow([c.codigo ?? '', c.nome, c.descricao || '']));
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivo(empresa, 'xlsx'));
};
