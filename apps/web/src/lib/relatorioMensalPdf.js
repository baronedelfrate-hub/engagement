// Relatório gerencial mensal em PDF (A4). jsPDF e autotable são carregados só quando o PDF é gerado.
import { MESES } from '@/lib/dreGerencial';
import { finalizarPdf } from '@/lib/pdfSaida';

const num = (v) => Number(v) || 0;
const fmt = (v) => {
  const n = num(v);
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
};
const pct = (v) => `${(num(v) * 100).toFixed(1).replace('.', ',')}%`;

const AZUL = [30, 58, 138];
const CINZA = [241, 245, 249];
const AMBAR = [254, 243, 199];

// ---- gráficos vetoriais (desenhados direto no PDF) ----
const AZUL_CLARO = [59, 130, 246];
const VERDE = [34, 197, 94];
const LARANJA = [249, 115, 22];
const VERMELHO = [239, 68, 68];

const passoBonito = (alvo) => {
  const pot = 10 ** Math.floor(Math.log10(alvo || 1));
  const f = alvo / pot;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pot;
};
const abrevia = (v) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(Math.round(a));
  return v < 0 ? `-${s}` : s;
};

// Barras agrupadas por mês, com linha do zero (aceita valores negativos). Devolve a altura ocupada a partir de y.
export const barrasVerticais = (doc, { x, y, w, h, rotulos, series }) => {
  const valores = series.flatMap((s) => s.valores);
  const max = Math.max(0, ...valores);
  const min = Math.min(0, ...valores);
  const passo = passoBonito((max - min || 1) / 4);
  const topo = Math.ceil(max / passo) * passo;
  const base = Math.floor(min / passo) * passo;
  const escala = h / ((topo - base) || 1);
  const yDe = (v) => y + (topo - v) * escala;
  const areaX = x + 14;
  const areaW = w - 14;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const nTicks = Math.round((topo - base) / passo);
  for (let k = 0; k <= nTicks; k++) {
    const v = base + k * passo;
    doc.line(areaX, yDe(v), x + w, yDe(v));
    doc.text(abrevia(v), areaX - 1.5, yDe(v) + 1, { align: 'right' });
  }

  const n = rotulos.length;
  const gW = areaW / n;
  const bW = Math.min((gW * 0.7) / series.length, 9);
  rotulos.forEach((r, i) => {
    const gx = areaX + gW * i + (gW - bW * series.length) / 2;
    series.forEach((s, j) => {
      const v = s.valores[i];
      const hh = Math.abs(v) * escala;
      if (hh > 0.05) {
        doc.setFillColor(...s.cor);
        doc.rect(gx + bW * j, yDe(Math.max(v, 0)), bW, hh, 'F');
      }
    });
    doc.setTextColor(100, 116, 139);
    doc.text(r, areaX + gW * i + gW / 2, yDe(base) + 4, { align: 'center' });
  });

  doc.setDrawColor(100, 116, 139);
  doc.line(areaX, yDe(0), x + w, yDe(0));

  let lx = areaX;
  doc.setFontSize(7.5);
  series.forEach((s) => {
    doc.setFillColor(...s.cor);
    doc.rect(lx, y - 6.5, 3, 3, 'F');
    doc.setTextColor(60, 60, 60);
    doc.text(s.nome, lx + 4.5, y - 4);
    lx += doc.getTextWidth(s.nome) + 12;
  });
  return h + 8;
};

// Barras horizontais com nome à esquerda e valor ao fim da barra. Devolve a altura ocupada.
export const barrasHorizontais = (doc, { x, y, w, itens, cor, corDestaque }) => {
  const max = Math.max(...itens.filter((i) => !i.resto).map((i) => i.valor), 1);
  const rotuloW = 62;
  const valorW = 24;
  const areaW = w - rotuloW - valorW;
  const linha = 6.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  itens.forEach((it, i) => {
    const yy = y + i * linha;
    let nome = it.nome;
    while (nome.length > 3 && doc.getTextWidth(nome) > rotuloW - 3) nome = nome.slice(0, -2);
    if (nome !== it.nome) nome = `${nome.trimEnd()}…`;
    doc.setTextColor(40, 40, 40);
    doc.text(nome, x, yy + 3.6);
    const bw = Math.min(Math.max((it.valor / max) * areaW, 0.3), areaW);
    doc.setFillColor(...(it.resto ? [148, 163, 184] : it.destaque ? corDestaque : cor));
    doc.rect(x + rotuloW, yy + 0.8, bw, 3.6, 'F');
    doc.text(fmt(it.valor), x + rotuloW + bw + 1.5, yy + 3.6);
  });
  return itens.length * linha + 2;
};

// maiores itens + uma linha "Demais" com o restante
export const topComDemais = (lista, n) => {
  if (lista.length <= n) return lista;
  return [...lista.slice(0, n), { nome: `Demais (${lista.length - n})`, total: lista.slice(n).reduce((s, c) => s + c.total, 0) }];
};

// dados: { empresa:{razao_social,nome_fantasia,cnpj}, ano, mes (0-11), dre, pe, dash, naoClassificado:{qtd,valor} }
export const gerarRelatorioMensalPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresa, ano, mes, dre, pe, dash, naoClassificado } = dados;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  const tituloMes = `${MESES[mes]}/${ano}`;
  let y = 16;

  // cabeçalho
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório Gerencial Mensal', margem, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresa?.nome_fantasia || empresa?.razao_social || ''}${empresa?.cnpj ? `  ·  CNPJ ${empresa.cnpj}` : ''}`, margem, 19);
  doc.text(`Competência: ${tituloMes}  ·  Regime de caixa (extrato bancário classificado)`, margem, 24);
  doc.setTextColor(30, 30, 30);
  y = 36;

  if (naoClassificado.qtd > 0) {
    const aviso = `Atenção: há ${naoClassificado.qtd} lançamento(s) sem classificação no ano, somando R$ ${fmt(Math.abs(naoClassificado.valor))}. Eles não entram nas linhas da DRE até serem classificados; o resultado pode estar melhor ou pior do que o real.`;
    doc.setFontSize(8.5);
    const linhasAviso = doc.splitTextToSize(aviso, largura - margem * 2 - 6);
    const alturaAviso = linhasAviso.length * 4 + 5;
    doc.setFillColor(...AMBAR);
    doc.rect(margem, y - 2, largura - margem * 2, alturaAviso, 'F');
    doc.setTextColor(146, 64, 14);
    doc.text(linhasAviso, margem + 3, y + 2.5);
    doc.setTextColor(30, 30, 30);
    y += alturaAviso + 6;
  }

  const secao = (titulo) => {
    if (y > 255) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...AZUL);
    doc.text(titulo, margem, y);
    doc.setTextColor(30, 30, 30);
    y += 3;
  };
  const proximoY = () => { y = doc.lastAutoTable.finalY + 9; };
  const garantir = (altura) => { if (y + altura > 275) { doc.addPage(); y = 18; } };
  const tituloGrafico = (texto) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(texto, margem, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
  };
  const estiloBase = { styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: AZUL, textColor: 255 }, margin: { left: margem, right: margem } };

  const p = dre.porChave;
  const m = (k) => p[k].valores[mes];
  const acum = (k) => p[k].valores.slice(0, mes + 1).reduce((s, v) => s + v, 0);
  const peMes = pe.meses[mes];

  // 1) resumo
  secao('1. Resumo do mês');
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['Indicador', tituloMes, `Acumulado ${ano}`]],
    body: [
      ['Receita bruta', fmt(m('receita_bruta')), fmt(acum('receita_bruta'))],
      ['Receita líquida', fmt(m('receita_liquida')), fmt(acum('receita_liquida'))],
      ['Lucro bruto', fmt(m('lucro_bruto')), fmt(acum('lucro_bruto'))],
      ['Resultado operacional', fmt(m('resultado_operacional')), fmt(acum('resultado_operacional'))],
      ['Lucro líquido', fmt(m('lucro_liquido')), fmt(acum('lucro_liquido'))],
      ['Margem líquida', m('receita_bruta') > 0 ? pct(m('lucro_liquido') / m('receita_bruta')) : '—', acum('receita_bruta') > 0 ? pct(acum('lucro_liquido') / acum('receita_bruta')) : '—']
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index === 4) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; } }
  });
  proximoY();

  const ateMes = Array.from({ length: mes + 1 }, (_, i) => i);
  garantir(66);
  tituloGrafico(`Receita líquida x lucro líquido — ${MESES[0]} a ${MESES[mes]}/${ano}`);
  y += 12;
  y += barrasVerticais(doc, {
    x: margem, y, w: largura - margem * 2, h: 42,
    rotulos: ateMes.map((i) => MESES[i]),
    series: [
      { nome: 'Receita líquida', cor: AZUL_CLARO, valores: ateMes.map((i) => p.receita_liquida.valores[i]) },
      { nome: 'Lucro líquido', cor: VERDE, valores: ateMes.map((i) => p.lucro_liquido.valores[i]) }
    ]
  }) + 8;

  // 2) DRE
  secao('2. DRE gerencial');
  const corpo = [];
  const estilos = [];
  let foraMarcado = false;
  for (const l of dre.linhas) {
    if (l.tipo === 'fora' && !foraMarcado) {
      corpo.push([{ content: 'Fora da DRE', colSpan: 3, styles: { fontStyle: 'italic', textColor: [100, 116, 139] } }]);
      estilos.push(null);
      foraMarcado = true;
    }
    corpo.push([l.rotulo, fmt(l.valores[mes]), fmt(l.valores.slice(0, mes + 1).reduce((s, v) => s + v, 0))]);
    estilos.push(l.tipo === 'subtotal' ? 'subtotal' : l.chave === 'nao_classificado' ? 'pendente' : null);
  }
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['Conta', tituloMes, `Acumulado ${ano}`]],
    body: corpo,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const e = estilos[d.row.index];
      if (e === 'subtotal') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; }
      if (e === 'pendente') d.cell.styles.fillColor = AMBAR;
    }
  });
  proximoY();

  // 2.1) DRE mês a mês (janeiro até o mês do relatório) em página deitada, com variação sobre o mês anterior e destaques
  {
    const L = 297; const M2 = 10;
    const fmt0 = (v) => { const n = Math.round(num(v)); const t = Math.abs(n).toLocaleString('pt-BR'); return n < 0 ? `(${t})` : (n === 0 ? '—' : t); };
    // variação do tamanho do valor: despesa que cresce aparece como +%, e receita que cai como -%
    const variacao = (atual, anterior) => {
      if (mes === 0) return '—';
      if (Math.abs(anterior) < 0.005) return Math.abs(atual) < 0.005 ? '—' : 'novo';
      const v = ((Math.abs(atual) - Math.abs(anterior)) / Math.abs(anterior)) * 100;
      return `${v > 0 ? '+' : ''}${v.toFixed(0).replace('.', ',')}%`;
    };
    const ehCusto = (valores) => valores.slice(0, mes + 1).reduce((t, v) => t + v, 0) < 0;
    const cabMeses = ateMes.map((i) => MESES[i]);
    const colunas = { 0: { cellWidth: 62, halign: 'left' } };
    for (let k = 1; k <= ateMes.length + 2; k++) colunas[k] = { halign: 'right' };
    const base2 = { styles: { fontSize: 7, cellPadding: 1.2 }, headStyles: { fillColor: AZUL, textColor: 255, halign: 'right' }, margin: { left: M2, right: M2 }, columnStyles: colunas };

    doc.addPage('a4', 'landscape');
    let y2 = 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AZUL);
    doc.text(`2.1 DRE gerencial mês a mês — ${MESES[0]} a ${MESES[mes]}/${ano}`, M2, y2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('Valores em R$ (arredondados). Variação = mês do relatório contra o mês anterior.', M2, y2 + 5);
    doc.setTextColor(30, 30, 30);
    y2 += 9;

    const linhasDre = dre.linhas.filter((l) => l.tipo === 'subtotal' || l.valores.slice(0, mes + 1).some((v) => Math.abs(v) >= 0.005));
    const corpo2 = []; const est2 = [];
    for (const l of linhasDre) {
      const vm = l.valores[mes]; const va = mes > 0 ? l.valores[mes - 1] : 0;
      corpo2.push([l.rotulo, ...ateMes.map((i) => fmt0(l.valores[i])), fmt0(l.valores.slice(0, mes + 1).reduce((t, v) => t + v, 0)), variacao(vm, va)]);
      est2.push(l.tipo === 'subtotal' ? 'subtotal' : l.chave === 'nao_classificado' ? 'pendente' : null);
    }
    autoTable(doc, {
      ...base2, startY: y2, head: [['Conta', ...cabMeses, 'Total', `Var. ${MESES[mes]}`]], body: corpo2,
      didParseCell: (d) => {
        if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
        if (d.section !== 'body') return;
        const e = est2[d.row.index];
        if (e === 'subtotal') { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; }
        if (e === 'pendente') d.cell.styles.fillColor = AMBAR;
        if (d.column.index === ateMes.length + 2) {
          const sobe = String(d.cell.raw).startsWith('+'); const cai = String(d.cell.raw).startsWith('-');
          const custo = ehCusto(linhasDre[d.row.index].valores);
          if (sobe || cai) d.cell.styles.textColor = (sobe !== custo) ? [22, 101, 52] : [185, 28, 28];
        }
      }
    });

    // destaques: maiores variações de um mês para o outro nas linhas que compõem o resultado
    if (mes > 0) {
      const cand = dre.linhas.filter((l) => l.tipo !== 'subtotal' && l.tipo !== 'neutro' && l.chave !== 'nao_classificado').map((l) => {
        const atual = l.valores[mes]; const ant = l.valores[mes - 1];
        return { rotulo: l.rotulo.replace(/^[\d.]+\s*/, ''), atual: Math.abs(atual), ant: Math.abs(ant), custo: ehCusto(l.valores), delta: Math.abs(atual) - Math.abs(ant) };
      }).filter((c) => Math.abs(c.delta) >= 100).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
      if (cand.length) {
        let yy = doc.lastAutoTable.finalY + 8;
        if (yy > 175) { doc.addPage('a4', 'landscape'); yy = 16; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...AZUL);
        doc.text(`Destaques de ${MESES[mes]} contra ${MESES[mes - 1]}`, M2, yy);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30);
        yy += 5;
        cand.forEach((c) => {
          const pctTxt = Math.abs(c.ant) < 0.005 ? 'sem valor no mês anterior' : `${c.delta > 0 ? '+' : ''}${((c.delta / Math.abs(c.ant)) * 100).toFixed(0)}%`;
          doc.text(`- ${c.rotulo}: de R$ ${fmt(c.ant)} para R$ ${fmt(c.atual)} (${c.delta > 0 ? 'aumento' : 'queda'} de R$ ${fmt(Math.abs(c.delta))}, ${pctTxt})${c.custo ? ' [despesa]' : ''}`, M2 + 2, yy);
          yy += 5;
        });
        y2 = yy;
      } else { y2 = doc.lastAutoTable.finalY + 6; }
    } else { y2 = doc.lastAutoTable.finalY + 6; }

    // principais despesas (subcategorias) mês a mês
    const despesas = [];
    for (const l of dre.linhas) {
      if (!/^(custo_|desp_)/.test(l.chave)) continue;
      for (const d of l.detalhes || []) despesas.push({ rotulo: d.rotulo, valores: d.valores });
    }
    const topDesp = despesas.map((d) => ({ ...d, total: d.valores.slice(0, mes + 1).reduce((t, v) => t + v, 0) })).filter((d) => Math.abs(d.total) >= 0.005).sort((a, b) => a.total - b.total).slice(0, 12);
    doc.addPage('a4', 'landscape');
    let y3 = 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...AZUL);
    doc.text(`2.2 Principais despesas mês a mês — ${MESES[0]} a ${MESES[mes]}/${ano}`, M2, y3);
    doc.setTextColor(30, 30, 30); y3 += 4;
    if (topDesp.length) {
      autoTable(doc, {
        ...base2, startY: y3, head: [['Conta', ...cabMeses, 'Total', `Var. ${MESES[mes]}`]],
        didParseCell: (d) => {
          if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
          if (d.section === 'body' && d.column.index === ateMes.length + 2) {
            const t = String(d.cell.raw); if (t.startsWith('+')) d.cell.styles.textColor = [185, 28, 28]; else if (t.startsWith('-')) d.cell.styles.textColor = [22, 101, 52];
          }
        },
        body: topDesp.map((d) => [d.rotulo, ...ateMes.map((i) => fmt0(d.valores[i])), fmt0(d.total), variacao(d.valores[mes], mes > 0 ? d.valores[mes - 1] : 0)])
      });
      y3 = doc.lastAutoTable.finalY + 8;
    } else { y3 += 6; }
    const alturaGraf = 195 - y3 - 14;
    if (alturaGraf > 40) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      doc.text(`Receita bruta, despesas e lucro líquido — ${MESES[0]} a ${MESES[mes]}/${ano}`, M2, y3);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
      barrasVerticais(doc, {
        x: M2, y: y3 + 12, w: L - M2 * 2, h: Math.min(alturaGraf - 20, 60), rotulos: cabMeses,
        series: [
          { nome: 'Receita bruta', cor: AZUL_CLARO, valores: ateMes.map((i) => p.receita_bruta.valores[i]) },
          { nome: 'Despesas (receita - lucro)', cor: LARANJA, valores: ateMes.map((i) => p.receita_bruta.valores[i] - p.lucro_liquido.valores[i]) },
          { nome: 'Lucro líquido', cor: VERDE, valores: ateMes.map((i) => p.lucro_liquido.valores[i]) }
        ]
      });
    }
    // volta à página retrato para o restante do relatório
    doc.addPage('a4', 'portrait');
    y = 18;
  }

  // 3) ponto de equilíbrio
  secao('3. Ponto de equilíbrio');
  const peAc = pe.acumulado;
  const situacaoPe = (x) => (!x.temDado ? '—' : x.peImpossivel ? 'Sem PE (margem negativa)' : x.acima ? 'Acima do PE' : 'Abaixo do PE');
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['', tituloMes, `Acumulado ${MESES[0]} a ${MESES[mes]}/${ano}`]],
    body: [
      ['Receita bruta', fmt(peMes.receita), fmt(peAc.receita)],
      ['Custos variáveis', fmt(peMes.variaveis), fmt(peAc.variaveis)],
      [pe.incluirSocios ? 'Custos fixos (incluem retiradas de sócios)' : 'Custos fixos', fmt(peMes.fixos), fmt(peAc.fixos)],
      ['Margem de contribuição (R$)', fmt(peMes.mc), fmt(peAc.mc)],
      ['Margem de contribuição (%)', pct(peMes.mcPct), pct(peAc.mcPct)],
      ['Ponto de equilíbrio (R$)', peMes.peImpossivel ? '—' : fmt(peMes.pe), peAc.peImpossivel ? '—' : fmt(peAc.pe)],
      ['Sobrou / faltou em relação ao PE (R$)', peMes.peImpossivel ? '—' : fmt(peMes.folga), peAc.peImpossivel ? '—' : fmt(peAc.folga)],
      ['Cobertura do PE (receita ÷ PE)', peMes.cobertura == null ? '—' : pct(peMes.cobertura), peAc.cobertura == null ? '—' : pct(peAc.cobertura)],
      ['Situação', situacaoPe(peMes), situacaoPe(peAc)]
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index === 5) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; } }
  });
  proximoY();
  if (pe.incluirSocios) {
    const nota = `Os custos fixos incluem as retiradas de sócios: ${fmt(peMes.retiradasSocios)} no mês e ${fmt(peAc.retiradasSocios)} no acumulado. Sem elas, o ponto de equilíbrio seria ${fmt(peMes.peSemSocios)} no mês e ${fmt(peAc.peSemSocios)} no acumulado.`;
    const linhasNota = doc.splitTextToSize(nota, largura - margem * 2);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(linhasNota, margem, y - 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    y += linhasNota.length * 3.6;
  }

  garantir(66);
  tituloGrafico(`Receita bruta x ponto de equilíbrio — ${MESES[0]} a ${MESES[mes]}/${ano}`);
  y += 12;
  y += barrasVerticais(doc, {
    x: margem, y, w: largura - margem * 2, h: 42,
    rotulos: ateMes.map((i) => MESES[i]),
    series: [
      { nome: 'Receita bruta', cor: AZUL_CLARO, valores: ateMes.map((i) => pe.meses[i].receita) },
      { nome: 'Ponto de equilíbrio', cor: LARANJA, valores: ateMes.map((i) => pe.meses[i].pe) }
    ]
  }) + 8;

  // 4) despesas por categoria
  secao(`4. Despesas por categoria — ${tituloMes}`);
  if (dash.despesasPorCategoria.length) {
    const itens = topComDemais(dash.despesasPorCategoria, 8).map((c) => ({ nome: c.nome, valor: c.total, destaque: c.nome === 'A CLASSIFICAR', resto: c.nome.startsWith('Demais (') }));
    garantir(itens.length * 6.2 + 14);
    y += 4;
    y += barrasHorizontais(doc, { x: margem, y, w: largura - margem * 2, itens, cor: VERMELHO, corDestaque: [245, 158, 11] }) + 3;
  }
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['Categoria', 'Total pago', '% das despesas']],
    body: dash.despesasPorCategoria.length
      ? [...dash.despesasPorCategoria.map((c) => [c.nome, fmt(c.total), dash.despesa > 0 ? pct(c.total / dash.despesa) : '—']), ['TOTAL', fmt(dash.despesa), '']]
      : [[{ content: 'Nenhuma despesa no mês.', colSpan: 3 }]],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.raw?.[0] === 'A CLASSIFICAR') d.cell.styles.fillColor = AMBAR;
      if (d.section === 'body' && d.row.raw?.[0] === 'TOTAL') d.cell.styles.fontStyle = 'bold';
    }
  });
  proximoY();

  // 5) receita por cliente
  secao(`5. Receita recebida por cliente — ${tituloMes}`);
  if (dash.receitaPorCliente.length) {
    const itens = topComDemais(dash.receitaPorCliente, 8).map((c) => ({ nome: c.nome, valor: c.total, resto: c.nome.startsWith('Demais (') }));
    garantir(itens.length * 6.2 + 14);
    y += 4;
    y += barrasHorizontais(doc, { x: margem, y, w: largura - margem * 2, itens, cor: AZUL_CLARO, corDestaque: AZUL_CLARO }) + 3;
  }
  const totalClientes = dash.receitaPorCliente.reduce((s, c) => s + c.total, 0);
  autoTable(doc, {
    ...estiloBase,
    startY: y,
    head: [['Cliente', 'Recebido', '% da receita']],
    body: dash.receitaPorCliente.length
      ? [...dash.receitaPorCliente.slice(0, 15).map((c) => [c.nome, fmt(c.total), pct(c.total / totalClientes)]),
        ...(dash.receitaPorCliente.length > 15 ? [[`Demais ${dash.receitaPorCliente.length - 15} clientes`, fmt(dash.receitaPorCliente.slice(15).reduce((s, c) => s + c.total, 0)), '']] : []),
        ['TOTAL', fmt(totalClientes), '']]
      : [[{ content: 'Nenhuma receita no mês.', colSpan: 3 }]],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.raw?.[0] === 'TOTAL') d.cell.styles.fontStyle = 'bold'; }
  });
  proximoY();

  // rodapé com numeração e data
  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const wPg = doc.internal.pageSize.getWidth(); const hPg = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · Engagement Soluções`, margem, hPg - 7);
    doc.text(`Página ${i} de ${total}`, wPg - margem, hPg - 7, { align: 'right' });
  }

  const nomeArquivo = `relatorio-gerencial_${(empresa?.nome_fantasia || empresa?.razao_social || 'empresa').replace(/[^\w]+/g, '-').toLowerCase()}_${ano}-${String(mes + 1).padStart(2, '0')}.pdf`;
  return finalizarPdf(doc, nomeArquivo, opcoes);
};
