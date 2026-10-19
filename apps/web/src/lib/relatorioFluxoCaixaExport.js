// Exportação do Relatório de Fluxo de Caixa em PDF e Excel. jsPDF e xlsx são carregados só ao exportar.
// Cada linha traz as colunas Previsto e Realizado lado a lado (saídas negativas); o mesmo título na mesma data vira uma linha só.
const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(v * 100) / 100;
const fmt = (v) => {
  const n = num(v);
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
};
const dataBR = (key) => (key ? key.split('-').reverse().join('/') : '');

const AZUL = [30, 58, 138];
const CINZA = [241, 245, 249];
const FORMATO_MOEDA = '#,##0.00;[Red]-#,##0.00';

const ROTULOS = {
  data: 'Data',
  tipo: 'Tipo',
  categoria: 'Categoria',
  centroCusto: 'Centro de Custo',
  descricao: 'Descrição',
  previsto: 'Previsto',
  realizado: 'Realizado'
};

// Status deixa de ser coluna: Previsto e Realizado são colunas. Elas aparecem quando "Valor" está marcado nas colunas da tela.
const colunasDoRelatorio = (selecionadas) => {
  const base = ['data', 'tipo', 'categoria', 'centroCusto', 'descricao'].filter((c) => selecionadas.includes(c));
  return selecionadas.includes('valor') ? [...base, 'previsto', 'realizado'] : base;
};

const valorComSinal = (m) => (m.tipo === 'Despesa' ? -num(m.valor) : num(m.valor));

// Junta previsto e realizado do mesmo título na mesma data
const agrupar = (linhas) => {
  const mapa = new Map();
  for (const m of linhas) {
    // mesmo título na mesma data = uma linha (previsto e realizado lado a lado); sem título, cada lançamento é uma linha
    const chave = m.titulo_id ? `${m.titulo_id}|${m.data_movimentacao}` : `avulso|${m.id}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        data_movimentacao: m.data_movimentacao, tipo: m.tipo, categoria: m.categoria, centro_custo_id: m.centro_custo_id,
        descricao: m.descricao, previsto: null, realizado: null
      });
    }
    const l = mapa.get(chave);
    const campo = m.status === 'Realizado' ? 'realizado' : 'previsto';
    l[campo] = r2((l[campo] || 0) + valorComSinal(m));
  }
  return [...mapa.values()].sort((a, b) => {
    if (a.data_movimentacao !== b.data_movimentacao) return a.data_movimentacao < b.data_movimentacao ? -1 : 1;
    return String(a.descricao).localeCompare(String(b.descricao), 'pt-BR');
  });
};

const totaisDe = (linhas) => {
  const soma = (tipo, status) => r2(linhas.filter((m) => m.tipo === tipo && m.status === status).reduce((s, m) => s + num(m.valor), 0));
  const entradasPrevisto = soma('Receita', 'Previsto');
  const saidasPrevisto = soma('Despesa', 'Previsto');
  const entradasRealizado = soma('Receita', 'Realizado');
  const saidasRealizado = soma('Despesa', 'Realizado');
  return {
    entradasPrevisto, saidasPrevisto, saldoPrevisto: r2(entradasPrevisto - saidasPrevisto),
    entradasRealizado, saidasRealizado, saldoRealizado: r2(entradasRealizado - saidasRealizado)
  };
};

const textoFiltros = (f) => {
  const partes = [`Período: ${dataBR(f.dataInicio)} a ${dataBR(f.dataFim)}`];
  partes.push(`Tipo: ${f.tipo === 'TODOS' ? 'todos' : f.tipo === 'Receita' ? 'entradas' : 'saídas'}`);
  partes.push(`Status: ${f.status === 'TODOS' ? 'todos' : f.status}`);
  if (f.categoria) partes.push(`Categoria contém "${f.categoria}"`);
  return partes.join('  ·  ');
};

const textoCelula = (coluna, l, centrosMap) => {
  switch (coluna) {
    case 'data': return dataBR(l.data_movimentacao);
    case 'tipo': return l.tipo === 'Receita' ? 'Entrada' : 'Saída';
    case 'categoria': return l.categoria || '';
    case 'centroCusto': { const c = centrosMap[l.centro_custo_id]; return c ? `${c.codigo} - ${c.nome}` : '-'; }
    case 'descricao': return l.descricao || '';
    case 'previsto': return l.previsto === null ? '' : fmt(l.previsto);
    case 'realizado': return l.realizado === null ? '' : fmt(l.realizado);
    default: return '';
  }
};

const nomeArquivo = (empresa, f, ext) =>
  `fluxo-de-caixa_${(empresa?.nome_fantasia || empresa?.razao_social || 'empresa').replace(/[^\w]+/g, '-').toLowerCase()}_${f.dataInicio}_a_${f.dataFim}.${ext}`;

// dados: { empresa, filtros, linhas (já filtradas), colunas (as da tela), centrosMap }
export const gerarFluxoCaixaPdf = async (dados) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresa, filtros, centrosMap } = dados;
  const linhas = agrupar(dados.linhas);
  const cols = colunasDoRelatorio(dados.colunas);
  const t = totaisDe(dados.linhas);
  const somaCol = (campo) => r2(linhas.reduce((s, l) => s + (l[campo] || 0), 0));

  // retrato por padrão; paisagem quando há muitas colunas
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: cols.length > 5 ? 'landscape' : 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 12;

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Relatório de Fluxo de Caixa', margem, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(empresa ? `${empresa.nome_fantasia || empresa.razao_social}${empresa.cnpj ? `  ·  CNPJ ${empresa.cnpj}` : ''}` : 'Empresas com acesso', margem, 16);
  doc.text(textoFiltros(filtros), margem, 21);
  doc.setTextColor(30, 30, 30);

  autoTable(doc, {
    startY: 30,
    margin: { left: margem, right: margem },
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: AZUL, textColor: 255 },
    head: [['Resumo', 'Previsto', 'Realizado']],
    body: [
      ['Entradas', fmt(t.entradasPrevisto), fmt(t.entradasRealizado)],
      ['Saídas', fmt(-t.saidasPrevisto), fmt(-t.saidasRealizado)],
      ['Saldo', fmt(t.saldoPrevisto), fmt(t.saldoRealizado)]
    ],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index === 2) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = CINZA; } },
    tableWidth: 90
  });

  const colunasNumericas = {};
  cols.forEach((c, i) => { if (c === 'previsto' || c === 'realizado') colunasNumericas[i] = { halign: 'right', cellWidth: 26 }; });
  const rodape = cols.map((c) => (c === 'previsto' ? fmt(somaCol('previsto')) : c === 'realizado' ? fmt(somaCol('realizado')) : ''));
  if (cols.length) rodape[0] = 'Total';

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: margem, right: margem, bottom: 14 },
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: AZUL, textColor: 255 },
    footStyles: { fillColor: CINZA, textColor: [30, 30, 30], fontStyle: 'bold' },
    showFoot: 'lastPage',
    head: [cols.map((c) => ROTULOS[c])],
    body: linhas.length
      ? linhas.map((l) => cols.map((c) => textoCelula(c, l, centrosMap)))
      : [[{ content: 'Nenhum lançamento para os filtros selecionados.', colSpan: Math.max(cols.length, 1) }]],
    foot: linhas.length ? [rodape] : undefined,
    columnStyles: colunasNumericas,
    didParseCell: (d) => {
      const c = cols[d.column.index];
      if (d.section === 'foot' && (c === 'previsto' || c === 'realizado')) d.cell.styles.halign = 'right';
      if (d.section === 'head' && (c === 'previsto' || c === 'realizado')) d.cell.styles.halign = 'right';
      if (d.section === 'body' && (c === 'previsto' || c === 'realizado') && String(d.cell.raw).startsWith('(')) d.cell.styles.textColor = [185, 28, 28];
    }
  });

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · ${linhas.length} linha(s) · saídas entre parênteses`, margem, altura - 6);
    doc.text(`Página ${i} de ${total}`, largura - margem, altura - 6, { align: 'right' });
  }

  const nome = nomeArquivo(empresa, filtros, 'pdf');
  doc.save(nome);
  return nome;
};

// serial de data do Excel (dias desde 30/12/1899), para a coluna Data ordenar e filtrar como data de verdade
const serialExcel = (key) => {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

export const gerarFluxoCaixaExcel = async (dados) => {
  const XLSX = await import('xlsx');
  const { empresa, filtros, centrosMap } = dados;
  const linhas = agrupar(dados.linhas);
  const cols = colunasDoRelatorio(dados.colunas);
  const t = totaisDe(dados.linhas);
  const wb = XLSX.utils.book_new();

  const aplicarFormato = (ws, formatos) => {
    const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = ref.s.r; r <= ref.e.r; r++) {
      for (let c = ref.s.c; c <= ref.e.c; c++) {
        const cel = ws[XLSX.utils.encode_cell({ r, c })];
        if (cel && cel.t === 'n') cel.z = formatos[c] || FORMATO_MOEDA;
      }
    }
  };

  const nomeEmpresa = empresa ? (empresa.nome_fantasia || empresa.razao_social) : 'Empresas com acesso';
  const resumo = [
    ['Relatório de Fluxo de Caixa'],
    [nomeEmpresa, empresa?.cnpj ? `CNPJ ${empresa.cnpj}` : ''],
    [textoFiltros(filtros)],
    [],
    ['Resumo', 'Previsto', 'Realizado'],
    ['Entradas', t.entradasPrevisto, t.entradasRealizado],
    ['Saídas', -t.saidasPrevisto, -t.saidasRealizado],
    ['Saldo', t.saldoPrevisto, t.saldoRealizado],
    [],
    ['Linhas no relatório', linhas.length]
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  aplicarFormato(wsResumo, { 1: FORMATO_MOEDA, 2: FORMATO_MOEDA });
  wsResumo['B10'].z = '0';
  wsResumo['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  const valorCelula = (c, l) => {
    switch (c) {
      case 'data': return serialExcel(l.data_movimentacao);
      case 'previsto': return l.previsto;   // vazio quando não há previsto naquela linha
      case 'realizado': return l.realizado; // vazio quando não há realizado naquela linha
      default: return textoCelula(c, l, centrosMap);
    }
  };
  const detalhe = [cols.map((c) => ROTULOS[c]), ...linhas.map((l) => cols.map((c) => valorCelula(c, l)))];
  const wsMov = XLSX.utils.aoa_to_sheet(detalhe);
  const formatos = {};
  cols.forEach((c, i) => { formatos[i] = c === 'data' ? 'dd/mm/yyyy' : FORMATO_MOEDA; });
  aplicarFormato(wsMov, formatos);

  // linha de total com fórmula (SOMA), separada por uma linha em branco para não atrapalhar filtros e ordenação
  const ultima = linhas.length + 1; // última linha de dados (a 1 é o cabeçalho)
  const linhaTotal = ultima + 2;
  if (linhas.length) {
    cols.forEach((c, i) => {
      const letra = XLSX.utils.encode_col(i);
      if (c === 'previsto' || c === 'realizado') {
        wsMov[`${letra}${linhaTotal}`] = { t: 'n', f: `SUM(${letra}2:${letra}${ultima})`, v: r2(linhas.reduce((s, l) => s + (l[c] || 0), 0)), z: FORMATO_MOEDA };
      }
    });
    wsMov[`A${linhaTotal}`] = { t: 's', v: 'TOTAL' };
    wsMov['!ref'] = `A1:${XLSX.utils.encode_col(Math.max(cols.length - 1, 0))}${linhaTotal}`;
  }
  const larguras = { data: 12, tipo: 10, categoria: 28, centroCusto: 28, descricao: 50, previsto: 16, realizado: 16 };
  wsMov['!cols'] = cols.map((c) => ({ wch: larguras[c] }));
  if (linhas.length) wsMov['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(Math.max(cols.length - 1, 0))}${ultima}` };
  XLSX.utils.book_append_sheet(wb, wsMov, 'Movimentos');

  const nome = nomeArquivo(empresa, filtros, 'xlsx');
  XLSX.writeFile(wb, nome);
  return nome;
};
