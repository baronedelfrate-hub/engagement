import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper to get company info (mock)
const getCompanyInfo = () => ({
  name: "ERP Pro Enterprise",
  cnpj: "00.000.000/0001-00"
});

/**
 * Export Data to Excel using ExcelJS for advanced formatting
 */
export const exportToExcel = async (data, columns, reportTitle, filtersDescription) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório');

  // 1. Header Info
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = reportTitle;
  titleCell.font = { name: 'Arial', size: 16, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:F2');
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `Gerado em: ${new Date().toLocaleString()} | Filtros: ${filtersDescription}`;
  subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF666666' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Columns Configuration
  // Map selected columns to worksheet columns
  const wsColumns = columns.map(col => ({
    header: col.label,
    key: col.id,
    width: col.width || 20,
    style: col.type === 'currency' 
        ? { numFmt: '"R$"#,##0.00;[Red]\-"R$"#,##0.00' } 
        : col.type === 'date' 
        ? { numFmt: 'dd/mm/yyyy' } 
        : {}
  }));

  worksheet.columns = wsColumns;

  // 3. Add Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.values = columns.map(c => c.label);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2C3E50' } // Dark Blue/Gray
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // 4. Add Data
  data.forEach(item => {
    const row = {};
    columns.forEach(col => {
        // Resolve nested accessors if needed (e.g. 'category.name') or transform values
        let val = item[col.id];
        if (col.type === 'date' && val) val = new Date(val);
        if (col.type === 'currency') val = parseFloat(val || 0);
        row[col.id] = val;
    });
    worksheet.addRow(row);
  });

  // 5. AutoFilter
  worksheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length }
  };

  // 6. Footer Totals (Optional - if 'currency' columns exist)
  const currencyCols = columns.filter(c => c.type === 'currency');
  if (currencyCols.length > 0) {
      const lastRowIdx = worksheet.rowCount + 1;
      const footerRow = worksheet.getRow(lastRowIdx);
      
      footerRow.getCell(1).value = 'TOTAL GERAL';
      footerRow.getCell(1).font = { bold: true };

      currencyCols.forEach(col => {
          // Find column index (1-based)
          const colIndex = columns.findIndex(c => c.id === col.id) + 1;
          const colLetter = worksheet.getColumn(colIndex).letter;
          // Formula: SUM(X5:Xn)
          footerRow.getCell(colIndex).value = { formula: `SUM(${colLetter}5:${colLetter}${lastRowIdx - 1})` };
          footerRow.getCell(colIndex).font = { bold: true };
          footerRow.getCell(colIndex).numFmt = '"R$"#,##0.00;[Red]\-"R$"#,##0.00';
      });
      
      footerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
  }

  // 7. Generate File
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `relatorio_${reportTitle.replace(/\s+/g, '_').toLowerCase()}_${new Date().getTime()}.xlsx`;
  saveAs(new Blob([buffer]), fileName);
};

/**
 * Export Data to PDF using jsPDF-AutoTable
 */
export const exportToPDF = (data, columns, reportTitle, filtersDescription) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(reportTitle, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado por: Sistema ERP | Data: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 26);
  doc.text(`Filtros Aplicados: ${filtersDescription}`, 14, 32);
  
  // Table
  const tableHead = [columns.map(c => c.label)];
  const tableBody = data.map(item => {
    return columns.map(col => {
      let val = item[col.id];
      if (col.type === 'date' && val) return new Date(val).toLocaleDateString('pt-BR');
      if (col.type === 'currency') return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      if (col.type === 'status') return val; // Could translate/map here
      return val;
    });
  });

  // Calculate Totals for Footer
  const currencyColsIndices = columns
      .map((c, i) => c.type === 'currency' ? i : -1)
      .filter(i => i !== -1);
  
  const totals = new Array(columns.length).fill('');
  if (currencyColsIndices.length > 0) {
      totals[0] = 'TOTAIS';
      currencyColsIndices.forEach(idx => {
          const sum = data.reduce((acc, item) => acc + (parseFloat(item[columns[idx].id] || 0)), 0);
          totals[idx] = sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      });
  }

  doc.autoTable({
    head: tableHead,
    body: tableBody,
    foot: currencyColsIndices.length > 0 ? [totals] : undefined,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    didDrawPage: (data) => {
        // Footer Page Number
        doc.setFontSize(8);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  const fileName = `relatorio_${reportTitle.replace(/\s+/g, '_').toLowerCase()}.pdf`;
  doc.save(fileName);
};