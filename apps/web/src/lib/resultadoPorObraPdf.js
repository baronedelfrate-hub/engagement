// Resultado por Obra em PDF (A4 paisagem): "DRE completa" (uma coluna por obra, com as contas) ou "Resumo" (uma linha por obra).
import { finalizarPdf } from '@/lib/pdfSaida';

const AZUL = [30, 58, 138]; const CINZA = [241, 245, 249]; const VERMELHO = [185, 28, 28]; const CINZA_TXT = [100, 100, 100];
const num = (v) => Number(v) || 0;
const fmt = (v) => { const n = num(v); return n === 0 ? '-' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

// Chaves de cada bloco do resumo, na ordem da DRE gerencial
const RESUMO = [
  ['receita_bruta', false], ['deducoes', false], ['receita_liquida', true],
  ['custo_mao_obra', false], ['custo_ferramentas', false], ['custo_midia', false], ['custo_deslocamento', false], ['custo_comissoes', false], ['lucro_bruto', true],
  ['desp_administrativas', false], ['desp_comerciais', false], ['desp_estrutura', false], ['desp_gerais', false], ['resultado_operacional', true],
  ['receita_financeira', false], ['desp_financeira', false], ['lucro_liquido', true]
];

// dados: { empresaNome, ano, filtros: { banco, projeto }, visao: 'dre' | 'resumo',
//          matriz: { cols:[{chave,nome,dre}], linhas }, resumoLinhas: [{nome,t(k),margem,naoClass}], total: {t,margem,naoClass} | null }
export const gerarResultadoPorObraPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresaNome = '', ano, filtros = {}, visao, matriz, resumoLinhas = [], total } = dados;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 12;
  const dre = visao === 'dre';

  doc.setFillColor(...AZUL); doc.rect(0, 0, largura, 24, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(dre ? 'DRE por Obra' : 'Resultado por Obra', margem, 10.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(empresaNome, margem, 16.5);
  doc.text(`Ano ${ano}  ·  Regime de caixa (extrato bancário classificado)  ·  Banco: ${filtros.banco || 'Todos'}  ·  Obra: ${filtros.projeto || 'Todas'}`, margem, 21);
  doc.setTextColor(30, 30, 30);

  const base = { styles: { fontSize: 8, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 }, headStyles: { fillColor: AZUL, textColor: 255, halign: 'center' }, margin: { left: margem, right: margem, bottom: 14 } };
  const celula = (v, extra = {}) => ({ content: fmt(v), styles: { halign: 'right', ...(num(v) < 0 ? { textColor: VERMELHO } : {}), ...extra } });

  if (dre && matriz) {
    const cols = matriz.cols;
    const ncols = cols.length;
    const head = [['Conta', ...cols.map((c) => c.nome)]];
    const body = [];
    const valorLinha = (c, chave) => c.dre.porChave[chave]?.total || 0;
    const valorDet = (c, chave, id) => c.dre.linhas.find((l) => l.chave === chave)?.detalhes.find((d) => d.id === id)?.total || 0;
    for (const l of matriz.linhas) {
      const sub = l.tipo === 'subtotal';
      if (l.chave === 'socios') body.push([{ content: 'FORA DA DRE', colSpan: ncols + 1, styles: { fontStyle: 'bold', textColor: CINZA_TXT, fillColor: [255, 255, 255], fontSize: 7 } }]);
      const tudoZero = cols.every((c) => valorLinha(c, l.chave) === 0);
      if (tudoZero && !sub && l.tipo !== 'grupo') continue;
      body.push([
        { content: l.rotulo, styles: { fontStyle: sub ? 'bold' : 'bold', ...(sub ? { fillColor: CINZA } : {}) } },
        ...cols.map((c) => celula(valorLinha(c, l.chave), { fontStyle: sub || c.chave === 'TOTAL' ? 'bold' : 'normal', ...(sub ? { fillColor: CINZA } : {}) }))
      ]);
      for (const d of l.detalhes) {
        if (cols.every((c) => valorDet(c, l.chave, d.id) === 0)) continue;
        body.push([
          { content: d.rotulo, styles: { fontSize: 7, textColor: CINZA_TXT, cellPadding: { top: 1, bottom: 1, left: 6, right: 1.6 } } },
          ...cols.map((c) => celula(valorDet(c, l.chave, d.id), { fontSize: 7 }))
        ]);
      }
    }
    const larg = largura - margem * 2;
    const wConta = Math.min(95, larg * 0.4);
    const colunas = { 0: { cellWidth: wConta } };
    cols.forEach((_, i) => { colunas[i + 1] = { cellWidth: (larg - wConta) / ncols, halign: 'right' }; });
    autoTable(doc, { ...base, startY: 30, head, body, columnStyles: colunas, theme: 'plain', willDrawCell: undefined });
  } else {
    // Resumo: uma linha por obra; só entram as colunas que têm algum valor
    const rotulos = {};
    for (const l of matriz?.linhas || []) rotulos[l.chave] = l.rotulo;
    const todas = [...resumoLinhas, ...(total ? [{ nome: 'TOTAL', t: total.t, margem: total.margem, naoClass: total.naoClass }] : [])];
    const usadas = RESUMO.filter(([k, sub]) => sub || todas.some((l) => num(l.t(k)) !== 0));
    const head = [['Obra / projeto', ...usadas.map(([k]) => rotulos[k] || k), 'Margem líq.']];
    const body = todas.map((l) => {
      const ehTotal = l.nome === 'TOTAL';
      return [
        { content: l.nome, styles: { fontStyle: 'bold', ...(ehTotal ? { fillColor: CINZA } : {}) } },
        ...usadas.map(([k, sub]) => celula(l.t(k), { fontStyle: sub || ehTotal ? 'bold' : 'normal', ...(ehTotal ? { fillColor: CINZA } : {}) })),
        { content: l.margem == null ? '-' : `${l.margem.toFixed(1).replace('.', ',')}%`, styles: { halign: 'right', fontStyle: ehTotal ? 'bold' : 'normal', ...(l.margem != null && l.margem < 0 ? { textColor: VERMELHO } : {}), ...(ehTotal ? { fillColor: CINZA } : {}) } }
      ];
    });
    const larg = largura - margem * 2;
    const wNome = 46;
    const colunas = { 0: { cellWidth: wNome } };
    const resto = (larg - wNome) / (usadas.length + 1);
    for (let i = 1; i <= usadas.length + 1; i++) colunas[i] = { cellWidth: resto, halign: 'right' };
    autoTable(doc, { ...base, startY: 30, head, body, columnStyles: colunas, theme: 'plain', styles: { ...base.styles, fontSize: usadas.length > 10 ? 7 : 8, cellPadding: 1.4 }, headStyles: { ...base.headStyles, fontSize: usadas.length > 10 ? 5.8 : 6.5, cellPadding: 1.2, valign: 'middle' } });
    const pend = todas.reduce((s, l) => s + (l.nome === 'TOTAL' ? 0 : num(l.naoClass)), 0);
    if (pend !== 0) {
      const y = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(8.5); doc.setTextColor(146, 64, 14);
      doc.text(`Atenção: há R$ ${Math.abs(pend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ainda não classificados; eles não entram no lucro.`, margem, y);
      doc.setTextColor(30, 30, 30);
    }
  }

  const total2 = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  const alturaPg = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total2; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, alturaPg - 6);
    doc.text(`Página ${i} de ${total2}`, largura - margem, alturaPg - 6, { align: 'right' });
  }
  const slug = (empresaNome || 'empresa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
  return finalizarPdf(doc, `${dre ? 'dre-por-obra' : 'resultado-por-obra'}_${slug}_${ano}.pdf`, opcoes);
};
