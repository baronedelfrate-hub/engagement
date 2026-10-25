// Pedido de compra em PDF (A4) para enviar ao fornecedor. jsPDF e autotable carregam só quando o PDF é gerado.
import { finalizarPdf } from '@/lib/pdfSaida';

const AZUL = [30, 58, 138];
const LARANJA = [254, 97, 2];
const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dia = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

// dados: { pedido, fornecedor:{nome,email,cnpj,telefone}, itens:[{quantidade,preco_unitario,desconto,valor_total,produto:{nome,sku,unidade_medida}}], empresa:{nome,email,telefone} }
export const gerarPedidoCompraPdf = async ({ pedido, fornecedor = {}, itens = [], empresa = {} }, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15;
  const L = doc.internal.pageSize.getWidth();

  doc.setFillColor(...AZUL); doc.rect(0, 0, L, 26, 'F');
  doc.setFillColor(...LARANJA); doc.rect(0, 26, L, 1.6, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('PEDIDO DE COMPRA', M, 15);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${pedido.numero || ''}`, L - M, 12, { align: 'right' });
  doc.text(`Emitido em ${dia(pedido.data_pedido)}`, L - M, 18, { align: 'right' });

  doc.setTextColor(40);
  let y = 38;
  const bloco = (titulo, linhas, x) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AZUL); doc.text(titulo, x, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
    linhas.filter(Boolean).forEach((t, i) => doc.text(String(t), x, y + 6 + i * 5));
  };
  bloco('COMPRADOR', [empresa.nome, empresa.email, empresa.telefone], M);
  bloco('FORNECEDOR', [fornecedor.nome, fornecedor.cnpj ? `CNPJ ${fornecedor.cnpj}` : null, fornecedor.email, fornecedor.telefone], L / 2 + 2);
  y += 28;

  doc.setFontSize(10);
  doc.text(`Entrega prevista: ${dia(pedido.data_entrega)}`, M, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Un.', 'Qtd.', 'Preço unit.', 'Desc.', 'Total']],
    body: itens.map((i) => [
      `${i.produto?.nome || 'Item'}${i.produto?.sku ? `  (${i.produto.sku})` : ''}`, i.produto?.unidade_medida || '',
      Number(i.quantidade || 0).toLocaleString('pt-BR'), dinheiro(i.preco_unitario), dinheiro(i.desconto), dinheiro(i.valor_total)
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: AZUL, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    margin: { left: M, right: M }
  });

  y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AZUL);
  doc.text(`Total do pedido: ${dinheiro(pedido.valor_total)}`, L - M, y, { align: 'right' });
  if (pedido.observacoes) {
    y += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('OBSERVAÇÕES', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40);
    doc.text(doc.splitTextToSize(String(pedido.observacoes), L - M * 2), M, y + 6);
  }

  const slug = (fornecedor.nome || 'fornecedor').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  return finalizarPdf(doc, `Pedido_de_compra_${String(pedido.numero || 's-n').replace(/[^A-Za-z0-9-]+/g, '_')}_${slug}.pdf`, opcoes);
};
