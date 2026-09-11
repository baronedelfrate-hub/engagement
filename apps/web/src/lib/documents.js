import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDateOnly } from './dateUtils';

const COMPANY_INFO = {
  name: "ERP Pro Enterprise",
  address: "Av. das Nações, 1234 - Centro Empresarial",
  city: "São Paulo - SP",
  phone: "(11) 3000-0000",
  email: "contato@erppro.com.br",
  website: "www.erppro.com.br"
};

export const generatePDF = (type, data, entityName) => {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(COMPANY_INFO.name, 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY_INFO.address, 20, 28);
  doc.text(`${COMPANY_INFO.city} | ${COMPANY_INFO.phone}`, 20, 33);
  doc.text(COMPANY_INFO.email, 20, 38);

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(0, 80, 180);
  doc.text(`${type.toUpperCase()} #${data.numeroPedido || data.id.slice(0,8)}`, 140, 20, { align: 'left' });
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Data: ${formatDateOnly(data.dataEmissao)}`, 140, 28);
  if (data.validade) doc.text(`Validade: ${formatDateOnly(data.validade)}`, 140, 33);

  // Entity Info (Client/Supplier)
  doc.setDrawColor(200);
  doc.line(20, 45, 190, 45);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Dados do Destinatário:", 20, 55);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Nome: ${entityName}`, 20, 62);
  // Add more entity details if available in the passed data object

  // Items Table
  const tableRows = data.itens.map(item => [
    item.tipo === 'produto' ? 'Produto' : 'Serviço',
    item.itemId, //Ideally should be name, but we handle names in component
    item.quantidade,
    `R$ ${parseFloat(item.valorUnitario).toFixed(2)}`,
    `R$ ${parseFloat(item.valorTotal).toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 70,
    head: [['Tipo', 'Item ID', 'Qtd', 'Valor Unit.', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 80, 180] },
    styles: { fontSize: 9 }
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  const total = data.itens.reduce((acc, curr) => acc + parseFloat(curr.valorTotal), 0);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Geral: R$ ${total.toFixed(2)}`, 190, finalY, { align: 'right' });

  if (data.observacoes) {
    doc.setFontSize(10);
    doc.text("Observações:", 20, finalY + 10);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(data.observacoes, 20, finalY + 16, { maxWidth: 170 });
  }

  doc.save(`${type}_${data.id}.pdf`);
};

export const generateWhatsAppLink = (type, data, entityName) => {
  const total = data.itens.reduce((acc, curr) => acc + parseFloat(curr.valorTotal), 0);
  const date = formatDateOnly(data.dataEmissao);
  const number = data.numeroPedido || data.id.slice(0,8);

  const text = `*${COMPANY_INFO.name}*\n\n` +
    `Olá ${entityName}, segue detalhes do *${type}*.\n\n` +
    `*Número:* ${number}\n` +
    `*Data:* ${date}\n` +
    `*Total:* R$ ${total.toFixed(2)}\n\n` +
    `Qualquer dúvida estamos à disposição!`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};