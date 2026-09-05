import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { supabase } from './customSupabaseClient';

export const NfsePdfGenerator = {
  async generateAndSave(nfseData) {
    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    // --- Header ---
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("NOTA FISCAL DE SERVIÇO ELETRÔNICA - NFS-e", 105, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número da Nota: ${nfseData.numero}`, 105, 25, { align: "center" });
    doc.text(`Data e Hora de Emissão: ${format(new Date(nfseData.data_emissao), 'dd/MM/yyyy HH:mm:ss')}`, 105, 30, { align: "center" });
    doc.text(`Código de Verificação: ${nfseData.protocolo_autorizacao || 'PENDENTE'}`, 105, 35, { align: "center" });
    
    y = 50;

    // --- Prestador ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PRESTADOR DE SERVIÇOS", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("EMPRESA EXEMPLO LTDA", margin, y);
    doc.text("CNPJ: 00.000.000/0001-00", margin + 100, y);
    y += 5;
    doc.text("Endereço: Av. Paulista, 1000 - São Paulo/SP", margin, y);
    doc.text("Inscrição Municipal: 123456-7", margin + 100, y);
    
    y += 10;
    doc.line(margin, y, 210 - margin, y);
    y += 8;

    // --- Tomador ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOMADOR DE SERVIÇOS", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    // Fetch client name if not in data (assuming data might be flat or populated)
    const clientName = nfseData.clientes?.nome || "Cliente Consumidor";
    const clientDoc = nfseData.clientes?.cnpj_cpf || "000.000.000-00";
    
    doc.text(`Nome/Razão Social: ${clientName}`, margin, y);
    doc.text(`CPF/CNPJ: ${clientDoc}`, margin + 100, y);
    y += 5;
    const clientAddress = nfseData.clientes?.endereco ? `${nfseData.clientes.endereco}, ${nfseData.clientes.cidade || ''}` : "Endereço não informado";
    doc.text(`Endereço: ${clientAddress}`, margin, y);

    y += 10;
    doc.line(margin, y, 210 - margin, y);
    y += 8;

    // --- Discriminação ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DISCRIMINAÇÃO DOS SERVIÇOS", margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    const splitDesc = doc.splitTextToSize(nfseData.descricao_servico || '', 180);
    doc.text(splitDesc, margin, y);
    y += (splitDesc.length * 5) + 5;

    // --- Detalhamento Específico ---
    if (nfseData.cnae) {
        doc.text(`CNAE: ${nfseData.cnae} - ${nfseData.codigo_servico}`, margin, y);
        y += 8;
    }

    doc.line(margin, y, 210 - margin, y);
    y += 8;

    // --- Valores ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("VALORES E IMPOSTOS (R$)", margin, y);
    y += 5;

    const tableData = [
        ['Valor Serviços', nfseData.valor_servicos],
        ['Deduções', '0,00'],
        ['Desconto Incond.', '0,00'],
        ['Base de Cálculo', nfseData.valor_servicos],
        ['Alíquota ISS', `${nfseData.aliquota_iss}%`],
        ['Valor ISS', nfseData.valor_iss],
        ['Valor PIS', nfseData.valor_pis],
        ['Valor COFINS', nfseData.valor_cofins],
        ['Valor IR', nfseData.valor_ir],
        ['Valor CSLL', nfseData.valor_csll],
        ['Valor Líquido', (nfseData.valor_servicos - (nfseData.iss_retido ? nfseData.valor_iss : 0) - nfseData.valor_pis - nfseData.valor_cofins - nfseData.valor_ir - nfseData.valor_csll).toFixed(2)]
    ].map(row => [row[0], typeof row[1] === 'number' ? row[1].toLocaleString('pt-BR', {minimumFractionDigits: 2}) : row[1]]);

    doc.autoTable({
        startY: y,
        head: [['Item', 'Valor']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin }
    });

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.text("Documento emitido por ME ou EPP optante pelo Simples Nacional (se aplicável).", margin, pageHeight - 20);
    doc.text(`Gerado em ${new Date().toLocaleString()}`, margin, pageHeight - 15);

    // In a real app, we would upload this blob to Supabase Storage and return the URL
    // For this demo, we'll return a data URI to display or a mock path
    // const pdfBlob = doc.output('blob');
    // const path = `nfse/${nfseData.numero}.pdf`;
    // await supabase.storage.from('documentos').upload(path, pdfBlob);
    
    return `nfse_${nfseData.numero}_generated.pdf`; // Mock path
  }
};