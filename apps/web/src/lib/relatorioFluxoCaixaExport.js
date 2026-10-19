// Exportação do Relatório de Fluxo de Caixa em PDF e Excel. jsPDF e xlsx são carregados só ao exportar.
const num = (v) => Number(v) || 0;
const fmt = (v) => {
  const n = num(v);
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
};
const dataBR = (key) => (key ? key.split('-').reverse().join('/') : '');

const AZUL = [30, 58, 138];
const CINZA = [241, 245, 249];

const ROTULOS = {
  data: 'Data',
  tipo: 'Tipo',
  status: 'Status',
  categoria: 'Categoria',
  centroCusto: 'Centro de Custo',
  descricao: 'Descrição',
  valor: 'Valor'
};
const ORDEM = ['data', 'tipo', 'status', 'categoria', 'centroCusto', 'descricao', 'valor'];

// Valor com sinal: saída negativa, entrada positiva
const valorComSinal = (m) => (m.tipo === 'Despesa' ? -num(m.valor) : num(m.valor));

const ordenar = (linhas) => [...linhas].sort((a, b) => {
  if (a.data_movimentacao !== b.data_movimentacao) return a.data_movimentacao < b.data_movimentacao ? -1 : 1;
  if (a.status !== b.status) return a.status < b.status ? -1 : 1;
  return String(a.descricao).localeCompare(String(b.descricao), 'pt-BR');
});

const totaisDe = (linhas) => {
  const soma = (tipo, status) => linhas.filter((m) => m.tipo === tipo && m.status === status).reduce((s, m) => s + num(m.valor), 0);
  const r2 = (v) => Math.round(v * 100) / 100;
  const entradasPrevisto = r2(soma('Receita', 'Previsto'));
  const saidasPrevisto = r2(soma('Despesa', 'Previsto'));
  const entradasRealizado = r2(soma('Receita', 'Realizado'));
  const saidasRealizado = r2(soma('Despesa', 'Realizado'));
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

const celula = (coluna, m, centrosMap) => {
  switch (coluna) {
    case 'data': return dataBR(m.data_movimentacao);
    case 'tipo': return m.tipo === 'Receita' ? 'Entrada' : 'Saída';
    case 'status': return m.status;
    case 'categoria': return m.categoria || '';
    case 'centroCusto': { const c = centrosMap[m.centro_custo_id]; return c ? `${c.codigo} - ${c.nome}` : '-'; }
    case 'descricao': return m.descricao || '';
    case 'valor': return fmt(valorComSinal(m));
    default: return '';
  }
};

const nomeArquivo = (empresa, f, ext) =>
  `fluxo-de-caixa_${(empresa?.nome_fantasia || empresa?.razao_social || 'empresa').replace(/[^\w]+/g, '-').toLowerCase()}_${f.dataInicio}_a_${f.dataFim}.${ext}`;

// dados: { empresa, filtros, linhas (já filtradas), colunas, centrosMap }
export const gerarFluxoCaixaPdf = async (dados) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const autoTableMod = await import('jspdf-autotable');
  const autoTable = autoTableMod.default?.default || autoTableMod.default || autoTableMod.autoTable;
  const { empresa, filtros, colunas, centrosMap } = dados;
  const linhas = ordenar(dados.linhas);
  const cols = ORDEM.filter((c) => colunas.includes(c));
  const t = totaisDe(linhas);

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

  const colunaValor = cols.indexOf('valor');
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: margem, right: margem, bottom: 14 },
    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: AZUL, textColor: 255 },
    head: [cols.map((c) => ROTULOS[c])],
    body: linhas.length
      ? linhas.map((m) => cols.map((c) => celula(c, m, centrosMap)))
      : [[{ content: 'Nenhum lançamento para os filtros selecionados.', colSpan: cols.length }]],
    columnStyles: colunaValor >= 0 ? { [colunaValor]: { halign: 'right', cellWidth: 28 } } : {},
    didParseCell: (d) => {
      if (d.section !== 'body' || colunaValor < 0 || d.column.index !== colunaValor) return;
      if (String(d.cell.raw).startsWith('(')) d.cell.styles.textColor = [185, 28, 28];
    }
  });

  const total = doc.getNumberOfPages();
  const emitido = new Date().toLocaleDateString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Emitido em ${emitido} · ${linhas.length} lançamento(s) · saídas entre parênteses`, margem, altura - 6);
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
  const { empresa, filtros, colunas, centrosMap } = dados;
  const linhas = ordenar(dados.linhas);
  const cols = ORDEM.filter((c) => colunas.includes(c));
  const t = totaisDe(linhas);
  const wb = XLSX.utils.book_new();

  const aplicarFormato = (ws, formatos) => {
    const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = ref.s.r; r <= ref.e.r; r++) {
      for (let c = ref.s.c; c <= ref.e.c; c++) {
        const cel = ws[XLSX.utils.encode_cell({ r, c })];
        if (cel && cel.t === 'n') cel.z = formatos[c] || '#,##0.00;[Red]-#,##0.00';
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
    ['Lançamentos no relatório', linhas.length]
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  aplicarFormato(wsResumo, { 1: '#,##0.00;[Red]-#,##0.00', 2: '#,##0.00;[Red]-#,##0.00' });
  wsResumo['B10'].z = '0';
  wsResumo['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  const valorCelula = (c, m) => {
    switch (c) {
      case 'data': return serialExcel(m.data_movimentacao);
      case 'valor': return valorComSinal(m);
      default: return celula(c, m, centrosMap);
    }
  };
  const detalhe = [cols.map((c) => ROTULOS[c]), ...linhas.map((m) => cols.map((c) => valorCelula(c, m)))];
  const wsMov = XLSX.utils.aoa_to_sheet(detalhe);
  const formatos = {};
  cols.forEach((c, i) => { formatos[i] = c === 'data' ? 'dd/mm/yyyy' : '#,##0.00;[Red]-#,##0.00'; });
  aplicarFormato(wsMov, formatos);
  const larguras = { data: 12, tipo: 10, status: 12, categoria: 28, centroCusto: 28, descricao: 50, valor: 16 };
  wsMov['!cols'] = cols.map((c) => ({ wch: larguras[c] }));
  if (wsMov['!ref']) wsMov['!autofilter'] = { ref: wsMov['!ref'] };
  XLSX.utils.book_append_sheet(wb, wsMov, 'Movimentos');

  const nome = nomeArquivo(empresa, filtros, 'xlsx');
  XLSX.writeFile(wb, nome);
  return nome;
};
