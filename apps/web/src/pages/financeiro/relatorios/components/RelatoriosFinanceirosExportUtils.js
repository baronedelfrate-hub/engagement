import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDateOnly } from '@/lib/dateUtils';

const LOGO_URL = "https://horizons-cdn.hostinger.com/43ae158d-775e-48c7-b200-7254194a0f9e/af31af53b69a979ae681cddadfef2c25.png";

const getBase64ImageFromUrl = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), false);
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
};

const formatCurrency = (val) => {
  return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const groupData = (data, keyFunc, labelFunc) => {
    const grouped = {};
    data.forEach(item => {
        const key = keyFunc(item) || 'Não Informado';
        const label = labelFunc(item) || 'Não Informado';
        if (!grouped[key]) {
            grouped[key] = { label, total: 0, pago: 0, pendente: 0 };
        }
        const val = parseFloat(item.valor_original || 0);
        grouped[key].total += val;
        if (item.status === 'Pago' || item.status === 'Recebido') {
            grouped[key].pago += val;
        } else {
            grouped[key].pendente += val;
        }
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
};

export const exportToExcel = async (data, columns, reportTitle, filtersDescription, source) => {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Dados Completos
  const ws1 = workbook.addWorksheet('Dados Completos');
  
  try {
      const logoBase64 = await getBase64ImageFromUrl(LOGO_URL);
      const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      ws1.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 40 } });
  } catch(e) {
      console.warn("Could not load logo for Excel", e);
  }

  ws1.addRow([]); ws1.addRow([]); ws1.addRow([]);
  
  const titleRow = ws1.addRow([reportTitle]);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF1E3A8A' } }; // Navy Blue
  
  const filterRow = ws1.addRow([filtersDescription]);
  filterRow.font = { size: 10, italic: true };
  ws1.addRow([]);

  const headerRow = ws1.addRow(columns.map(c => c.label));
  headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  data.forEach(row => {
      const rowData = columns.map(col => {
          let val = row[col.id];
          if (col.type === 'date' && val) return formatDateOnly(val);
          if (col.type === 'currency') return parseFloat(val || 0);
          return val || '-';
      });
      const addedRow = ws1.addRow(rowData);
      addedRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (columns[colNumber - 1].type === 'currency') cell.numFmt = '"R$" #,##0.00';
      });
  });

  ws1.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) maxLength = columnLength;
      });
      column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
  });

  // Helper to add summary sheets
  const addSummarySheet = (sheetName, dataGroup) => {
      const ws = workbook.addWorksheet(sheetName);
      ws.addRow([`Resumo: ${sheetName}`]).font = { size: 14, bold: true, color: { argb: 'FFEA580C' } }; // Orange
      ws.addRow([]);
      
      const hRow = ws.addRow(['Descrição', 'Total', 'Pago/Recebido', 'Pendente']);
      hRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });

      dataGroup.forEach(item => {
          const r = ws.addRow([item.label, item.total, item.pago, item.pendente]);
          r.getCell(2).numFmt = '"R$" #,##0.00';
          r.getCell(3).numFmt = '"R$" #,##0.00';
          r.getCell(4).numFmt = '"R$" #,##0.00';
      });
      
      ws.columns.forEach((col, i) => { col.width = i === 0 ? 40 : 20; });
  };

  const isPagar = source === 'CONTAS_PAGAR';
  
  const byDia = groupData(data, i => i.data_vencimento, i => i.data_vencimento ? formatDateOnly(i.data_vencimento) : 'Sem Data');
  const byEntidade = groupData(data, i => isPagar ? i.fornecedor_id : i.cliente_id, i => isPagar ? i.fornecedor_nome : i.cliente_nome);
  const byCategoria = groupData(data, i => i.categoria_id, i => i.categoria_nome);
  const byCentro = groupData(data, i => i.centro_custo_id, i => i.centro_custo_nome);

  addSummarySheet('Resumo por Dia', byDia);
  addSummarySheet(isPagar ? 'Resumo por Fornecedor' : 'Resumo por Cliente', byEntidade);
  addSummarySheet('Resumo por Categoria', byCategoria);
  addSummarySheet('Resumo por Centro de Custo', byCentro);

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(new Blob([buffer]), `Relatorio_${isPagar ? 'ContasPagar' : 'ContasReceber'}_${dateStr}.xlsx`);
};

export const exportToPDF = async (data, columns, reportTitle, filtersDescription, source) => {
  const doc = new jsPDF('landscape');
  const isPagar = source === 'CONTAS_PAGAR';

  try {
      const logoBase64 = await getBase64ImageFromUrl(LOGO_URL);
      doc.addImage(logoBase64, 'PNG', 14, 10, 40, 15);
  } catch (e) {
      console.warn("Could not load logo for PDF", e);
  }

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Navy
  doc.text(reportTitle, 14, 35);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(filtersDescription, 14, 42);

  // Main Table
  const tableColumn = columns.map(c => c.label);
  const tableRows = data.map(row => {
      return columns.map(col => {
          let val = row[col.id];
          if (col.type === 'date' && val) return formatDateOnly(val);
          if (col.type === 'currency') return formatCurrency(val);
          return val || '-';
      });
  });

  doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 }, // Navy Blue
      alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Summaries
  const addPdfSummary = (title, dataGroup) => {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12); // Orange
      doc.text(title, 14, 20);

      const head = [['Descrição', 'Total', 'Pago/Recebido', 'Pendente']];
      const body = dataGroup.map(item => [
          item.label,
          formatCurrency(item.total),
          formatCurrency(item.pago),
          formatCurrency(item.pendente)
      ]);

      doc.autoTable({
          head, body,
          startY: 25,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [30, 58, 138], textColor: 255 }
      });
  };

  const byDia = groupData(data, i => i.data_vencimento, i => i.data_vencimento ? formatDateOnly(i.data_vencimento) : 'Sem Data');
  const byEntidade = groupData(data, i => isPagar ? i.fornecedor_id : i.cliente_id, i => isPagar ? i.fornecedor_nome : i.cliente_nome);
  const byCategoria = groupData(data, i => i.categoria_id, i => i.categoria_nome);
  const byCentro = groupData(data, i => i.centro_custo_id, i => i.centro_custo_nome);

  addPdfSummary('Resumo por Dia', byDia);
  addPdfSummary(isPagar ? 'Resumo por Fornecedor' : 'Resumo por Cliente', byEntidade);
  addPdfSummary('Resumo por Categoria', byCategoria);
  addPdfSummary('Resumo por Centro de Custo', byCentro);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em ${new Date().toLocaleString()} - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Relatorio_${isPagar ? 'ContasPagar' : 'ContasReceber'}_${dateStr}.pdf`);
};