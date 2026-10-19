// Relatório de Diagnóstico Financeiro (PDF, A4) — documento para o cliente. Não inclui as notas internas nem a consolidação.
import {
  SECOES_QUESTIONARIO, DIMENSOES_MATURIDADE, ESCALA_MATURIDADE, EXPLICACAO_NIVEL,
  calcularMaturidade, faixaVolume, planoRecomendado
} from '@/lib/engDiagnosticoConfig';

const AZUL = [30, 58, 138];
const AZUL_CLARO = [59, 130, 246];
const CINZA = [241, 245, 249];
const COR_NIVEL = { 'Caótico': [239, 68, 68], 'Básico': [249, 115, 22], 'Organizado': [234, 179, 8], 'Estruturado': [34, 197, 94] };

const dataBR = (iso) => {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

const textoResposta = (p, valor) => {
  if (valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0)) return '—';
  return Array.isArray(valor) ? valor.join('; ') : String(valor);
};

// cliente: { nome, ... }  diagnostico: { data, respostas, maturidade, plano_final, plano_recomendado }  consultorNome: string
export const gerarDiagnosticoPdf = async ({ cliente, diagnostico, consultorNome }) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;

  const respostas = diagnostico.respostas || {};
  const mat = Array.isArray(diagnostico.maturidade) ? diagnostico.maturidade : [];
  const res = calcularMaturidade(mat);
  const lancamentos = respostas['7.2'] ?? diagnostico.volume?.lancamentos;
  const faixa = faixaVolume(lancamentos);
  const plano = diagnostico.plano_final || diagnostico.plano_recomendado || planoRecomendado(res.nivel, lancamentos);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  let y = 36;

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Diagnóstico Financeiro', margem, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.nome || '', margem, 19);
  doc.text(`Engagement Soluções · Metodologia BPO E5${diagnostico.data ? `  ·  ${dataBR(diagnostico.data)}` : ''}${consultorNome ? `  ·  Consultor: ${consultorNome}` : ''}`, margem, 24);
  doc.setTextColor(30, 30, 30);

  const garantir = (altura) => { if (y + altura > 278) { doc.addPage(); y = 18; } };
  const secao = (titulo) => {
    garantir(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...AZUL);
    doc.text(titulo, margem, y);
    doc.setTextColor(30, 30, 30);
    y += 3;
  };
  const proximoY = () => { y = doc.lastAutoTable.finalY + 8; };
  const estiloBase = { styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: AZUL, textColor: 255 }, margin: { left: margem, right: margem } };

  // 1) resultado
  secao('1. Resultado do diagnóstico');
  y += 3;
  if (res.indice === null) {
    doc.setFontSize(9);
    doc.text('O diagnóstico de maturidade ainda não foi preenchido.', margem, y);
    y += 8;
  } else {
    const cor = COR_NIVEL[res.nivel] || AZUL_CLARO;
    const w = (largura - margem * 2 - 8) / 3;
    const caixas = [
      { titulo: 'Índice de maturidade', valor: `${res.indice} / 100`, sub: res.nivel, cor },
      { titulo: 'Volume da operação', valor: faixa || '—', sub: lancamentos !== undefined && lancamentos !== '' ? `${lancamentos} lançamentos/mês` : '', cor: AZUL_CLARO },
      { titulo: 'Plano recomendado', valor: plano || '—', sub: '', cor: AZUL }
    ];
    caixas.forEach((c, i) => {
      const x = margem + i * (w + 4);
      doc.setFillColor(...CINZA);
      doc.roundedRect(x, y, w, 24, 2, 2, 'F');
      doc.setFillColor(...c.cor);
      doc.rect(x, y, 1.8, 24, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.titulo.toUpperCase(), x + 5, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(c.valor.length > 16 ? 9 : 14);
      doc.setTextColor(30, 30, 30);
      doc.text(doc.splitTextToSize(c.valor, w - 8), x + 5, y + 14);
      if (c.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(c.sub, x + 5, y + 21);
      }
    });
    y += 30;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const expl = doc.splitTextToSize(EXPLICACAO_NIVEL[res.nivel] || '', largura - margem * 2);
    doc.text(expl, margem, y);
    y += expl.length * 4.2 + 6;
  }

  // 2) maturidade por dimensão
  if (res.indice !== null) {
    secao('2. Maturidade por dimensão');
    y += 4;
    let base = 0;
    DIMENSOES_MATURIDADE.forEach((d) => {
      const valores = d.itens.map((_, i) => mat[base + i]).filter((v) => Number.isInteger(v));
      base += d.itens.length;
      const pontos = valores.reduce((s, v) => s + v, 0);
      const pctDim = valores.length ? pontos / (d.itens.length * 3) : 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`${d.id}. ${d.titulo}`, margem, y + 3.5);
      const bx = margem + 58;
      const bw = largura - margem * 2 - 58 - 18;
      doc.setFillColor(226, 232, 240);
      doc.rect(bx, y, bw, 4.5, 'F');
      doc.setFillColor(...AZUL_CLARO);
      doc.rect(bx, y, Math.max(bw * pctDim, 0.3), 4.5, 'F');
      doc.text(`${Math.round(pctDim * 100)}%`, bx + bw + 3, y + 3.5);
      y += 8;
    });
    y += 2;

    let k = 0;
    const corpo = [];
    DIMENSOES_MATURIDADE.forEach((d) => {
      corpo.push([{ content: `${d.id}. ${d.titulo}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: CINZA } }]);
      d.itens.forEach((it) => {
        const v = mat[k++];
        corpo.push([it, Number.isInteger(v) ? ESCALA_MATURIDADE[v].rotulo : '—']);
      });
    });
    autoTable(doc, { ...estiloBase, startY: y, head: [['Item avaliado', 'Situação']], body: corpo, columnStyles: { 1: { cellWidth: 48 } } });
    proximoY();
  }

  // 3) respostas do questionário
  secao('3. Respostas do questionário');
  SECOES_QUESTIONARIO.forEach((s) => {
    const linhas = s.perguntas.map((p) => [p.id, p.texto, textoResposta(p, respostas[p.id])]);
    garantir(20);
    autoTable(doc, {
      ...estiloBase,
      startY: y + 2,
      head: [[{ content: `${s.id}. ${s.titulo}`, colSpan: 3 }]],
      body: linhas,
      columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 92 } },
      didParseCell: (d) => { if (d.section === 'head') d.cell.styles.fillColor = AZUL_CLARO; }
    });
    y = doc.lastAutoTable.finalY + 4;
  });

  // rodapé
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Engagement Soluções  ·  (19) 99122-1912  ·  engagementsolucoes.com.br  ·  Documento confidencial', margem, 290);
    doc.text(`Página ${i} de ${total}`, largura - margem, 290, { align: 'right' });
  }

  const nomeArquivo = `Diagnostico_${(cliente.nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
  doc.save(nomeArquivo);
  return nomeArquivo;
};
