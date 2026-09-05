import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a CSV file that opens in Excel.
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file
 * @param {string} type - 'PAGAR' or 'RECEBER'
 */
export const exportToExcel = (data, filename, type) => {
  const headers = [
    'Número Título',
    type === 'PAGAR' ? 'Fornecedor' : 'Cliente',
    'Vencimento',
    'Valor Parcela',
    'Status',
    'Categoria',
    'Observações'
  ];

  // CSV Content with BOM for Excel UTF-8 compatibility
  let csvContent = "\uFEFF" + headers.join(";") + "\n";

  data.forEach(item => {
    const row = [
      item.displayNumero || item.numeroTitulo,
      item.entidadeNome || (type === 'PAGAR' ? item.fornecedorNome : item.clienteNome),
      new Date(item.displayVencimento || item.dataVencimento).toLocaleDateString('pt-BR'),
      (item.displayValor || item.valorTotal || 0).toFixed(2).replace('.', ','),
      item.displayStatus || item.status,
      item.categoriaNome || '',
      item.observacoes || ''
    ];
    // Escape quotes and wrap in quotes to handle semicolons in text
    const escapedRow = row.map(str => `"${String(str).replace(/"/g, '""')}"`);
    csvContent += escapedRow.join(";") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Generates a PDF report.
 * @param {Array} data - Array of objects
 * @param {string} title - Report Title
 * @param {string} type - 'PAGAR' or 'RECEBER'
 */
export const generateRelatorioFinanceiroPDF = (data, title, type) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

  const tableColumn = [
    "Título", 
    type === 'PAGAR' ? "Fornecedor" : "Cliente", 
    "Vencimento", 
    "Valor (R$)", 
    "Status"
  ];

  const tableRows = [];
  let totalValor = 0;
  let totalPago = 0;
  let totalPendente = 0;

  data.forEach(ticket => {
    const valor = ticket.displayValor || ticket.valorTotal || 0;
    const status = ticket.displayStatus || ticket.status;
    
    totalValor += valor;
    if (status === 'Pago' || status === 'Recebido') totalPago += valor;
    else totalPendente += valor;

    const ticketData = [
      ticket.displayNumero || ticket.numeroTitulo,
      ticket.entidadeNome || (type === 'PAGAR' ? ticket.fornecedorNome : ticket.clienteNome),
      new Date(ticket.displayVencimento || ticket.dataVencimento).toLocaleDateString('pt-BR'),
      valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      status
    ];
    tableRows.push(ticketData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: type === 'PAGAR' ? [185, 28, 28] : [16, 185, 129] }, // Red for Pagar, Green for Receber
    styles: { fontSize: 9 },
  });

  // Summary Logic
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Resumo do Relatório", 14, finalY);
  
  doc.setFontSize(10);
  doc.text(`Total Geral: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 8);
  doc.setTextColor(type === 'PAGAR' ? 185 : 0, type === 'PAGAR' ? 28 : 150, 28);
  doc.text(`Total Pendente: R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 14);
  doc.setTextColor(0, 128, 0);
  doc.text(`Total ${type === 'PAGAR' ? 'Pago' : 'Recebido'}: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, finalY + 20);

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};