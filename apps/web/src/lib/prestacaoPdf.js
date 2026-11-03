import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { finalizarPdf } from '@/lib/pdfSaida';
import { moeda, fmtData } from '@/lib/prestacaoContas';

// PDF da prestação de contas da obra, para enviar ao cliente.
export const gerarPrestacaoPdf = ({ empresa, obra, periodo, resumo }, opcoes = {}) => {
  const doc = new jsPDF('portrait');
  const W = doc.internal.pageSize.getWidth();
  doc.setFontSize(16); doc.setTextColor(30, 58, 138); doc.text('Prestação de contas da obra', 14, 18);
  doc.setFontSize(11); doc.setTextColor(40, 40, 40); doc.text(obra, 14, 26);
  doc.setFontSize(9); doc.setTextColor(100, 100, 100);
  doc.text(`${empresa} · ${periodo} · emitido em ${fmtData(new Date().toISOString())}`, 14, 32);

  doc.autoTable({
    startY: 38, theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: [30, 58, 138] },
    head: [['Recebido do cliente', 'Pago por conta do cliente', 'Saldo da obra']],
    body: [[moeda(resumo.recebido), moeda(resumo.pago), moeda(resumo.saldo)]]
  });
  if (resumo.aPagar > 0 || resumo.aReceber > 0) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 4, theme: 'plain', styles: { fontSize: 9 },
      body: [[`Contas a pagar da obra ainda em aberto: ${moeda(resumo.aPagar)}`, `Saldo após as contas em aberto: ${moeda(resumo.saldoProjetado)}`]]
    });
  }

  const tabela = (titulo, linhas, colunas, corpo) => {
    if (!linhas.length) return;
    doc.setFontSize(11); doc.setTextColor(30, 58, 138);
    doc.text(titulo, 14, doc.lastAutoTable.finalY + 10);
    doc.autoTable({ startY: doc.lastAutoTable.finalY + 13, theme: 'striped', styles: { fontSize: 8 }, headStyles: { fillColor: [30, 58, 138] }, head: [colunas], body: corpo,
      columnStyles: { [colunas.length - 1]: { halign: 'right' } } });
  };
  tabela('Recebimentos do cliente', resumo.recebimentos, ['Data', 'Origem', 'Valor'],
    resumo.recebimentos.map((l) => [fmtData(l.data_transacao), l.contraparte || l.descricao, moeda(l.valor)]));
  tabela('Pagamentos feitos por conta do cliente', resumo.pagamentos, ['Data', 'Fornecedor / descrição', 'NF / título', 'Valor'],
    resumo.pagamentos.map((l) => [fmtData(l.data_transacao), l.contraparte || l.descricao, l.nota_fiscal || l.titulo || '—', moeda(l.valorAbs)]));
  tabela('Contas da obra ainda a pagar', resumo.abertos.filter((t) => t.tipo === 'pagar'), ['Vencimento', 'Fornecedor / descrição', 'NF / título', 'Valor'],
    resumo.abertos.filter((t) => t.tipo === 'pagar').map((t) => [fmtData(t.data_vencimento), t.contraparte || '—', t.numero_titulo || '—', moeda(t.saldo)]));

  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${i} de ${n}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' }); }
  return finalizarPdf(doc, `Prestacao_de_contas_${obra.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`, opcoes);
};
