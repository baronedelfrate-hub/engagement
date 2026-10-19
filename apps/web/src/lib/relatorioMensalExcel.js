// Relatório gerencial em Excel (.xlsx), com os mesmos números do PDF. A biblioteca xlsx é carregada só ao gerar.
import { MESES } from '@/lib/dreGerencial';

const FORMATO_MOEDA = '#,##0.00;[Red]-#,##0.00';
const FORMATO_PCT = '0.0%';

// Converte uma matriz (linhas de células) em planilha, aplicando formato numérico e largura de colunas.
const montarAba = (XLSX, linhas, { larguras = [], formatos = {} } = {}) => {
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  const ref = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = ref.s.r; r <= ref.e.r; r++) {
    for (let c = ref.s.c; c <= ref.e.c; c++) {
      const cel = ws[XLSX.utils.encode_cell({ r, c })];
      if (cel && cel.t === 'n') cel.z = formatos[`${r}:${c}`] || formatos[`*:${c}`] || FORMATO_MOEDA;
    }
  }
  ws['!cols'] = larguras.map((wch) => ({ wch }));
  return ws;
};

// dados: { empresa, ano, mes (0-11), dre, pe, dash, naoClassificado }
export const gerarRelatorioMensalExcel = async (dados) => {
  const XLSX = await import('xlsx');
  const { empresa, ano, mes, dre, pe, dash, naoClassificado } = dados;
  const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || '';
  const tituloMes = `${MESES[mes]}/${ano}`;
  const p = dre.porChave;
  const acum = (k) => p[k].valores.slice(0, mes + 1).reduce((s, v) => s + v, 0);
  const wb = XLSX.utils.book_new();

  // 1) Resumo
  const resumo = [
    ['Relatório Gerencial Mensal'],
    [nomeEmpresa, empresa?.cnpj ? `CNPJ ${empresa.cnpj}` : ''],
    [`Competência: ${tituloMes}`, 'Regime de caixa (extrato bancário classificado)'],
    [],
    ['Indicador', tituloMes, `Acumulado ${ano}`],
    ['Receita bruta', p.receita_bruta.valores[mes], acum('receita_bruta')],
    ['Receita líquida', p.receita_liquida.valores[mes], acum('receita_liquida')],
    ['Lucro bruto', p.lucro_bruto.valores[mes], acum('lucro_bruto')],
    ['Resultado operacional', p.resultado_operacional.valores[mes], acum('resultado_operacional')],
    ['Lucro líquido', p.lucro_liquido.valores[mes], acum('lucro_liquido')],
    ['Margem líquida', p.receita_bruta.valores[mes] > 0 ? p.lucro_liquido.valores[mes] / p.receita_bruta.valores[mes] : 0, acum('receita_bruta') > 0 ? acum('lucro_liquido') / acum('receita_bruta') : 0]
  ];
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, resumo, { larguras: [32, 18, 18], formatos: { '10:1': FORMATO_PCT, '10:2': FORMATO_PCT } }), 'Resumo');

  // 2) DRE do ano, com as contas de cada linha logo abaixo
  const cab = ['Conta', ...MESES.map((m) => `${m}/${String(ano).slice(2)}`), 'Total'];
  const dreLinhas = [cab];
  let foraMarcado = false;
  for (const l of dre.linhas) {
    if (l.tipo === 'fora' && !foraMarcado) { dreLinhas.push(['FORA DA DRE']); foraMarcado = true; }
    dreLinhas.push([l.rotulo, ...l.valores, l.total]);
    for (const d of l.detalhes) dreLinhas.push([`      ${d.rotulo}`, ...d.valores, d.total]);
  }
  dreLinhas.push([], ['Total movimentação líquida (conferência)', ...dre.conferencia.valores, dre.conferencia.total]);
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, dreLinhas, { larguras: [52, ...Array(13).fill(13)] }), 'DRE');

  // 3) Ponto de equilíbrio por mês
  const col = (f) => [...pe.meses.map(f), f(pe.total)];
  const situacaoPe = (m) => (!m.temDado ? '' : m.peImpossivel ? 'Sem PE (margem negativa)' : m.acima ? 'Acima do PE' : 'Abaixo do PE');
  const linhasPeDef = [
    ['Receita bruta', (m) => m.receita],
    ['Custos variáveis', (m) => m.variaveis],
    [pe.incluirSocios ? 'Custos fixos (incluem retiradas de sócios)' : 'Custos fixos', (m) => m.fixos],
    ...(pe.incluirSocios ? [['   retiradas de sócios incluídas', (m) => m.retiradasSocios], ['PE sem as retiradas (R$)', (m) => m.peSemSocios]] : []),
    ['Margem de contribuição (R$)', (m) => m.mc],
    ['Margem de contribuição (%)', (m) => m.mcPct, 'pct'],
    ['Ponto de equilíbrio (R$)', (m) => (m.peImpossivel ? null : m.pe)],
    ['Sobrou / faltou em relação ao PE (R$)', (m) => (m.peImpossivel ? null : m.folga)],
    ['Cobertura do PE (receita ÷ PE)', (m) => m.cobertura, 'pct'],
    ['Situação', situacaoPe]
  ];
  const peLinhas = [
    ['Conta', ...MESES, 'Total do ano'],
    ...linhasPeDef.map(([rotulo, f]) => [rotulo, ...col(f)]),
    [],
    ['Retiradas de sócios como custo fixo:', pe.incluirSocios ? 'incluídas' : 'não incluídas']
  ];
  const fmtPe = {};
  linhasPeDef.forEach(([, , tipo], r) => { if (tipo === 'pct') for (let c = 1; c <= 13; c++) fmtPe[`${r + 1}:${c}`] = FORMATO_PCT; });
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, peLinhas, { larguras: [44, ...Array(13).fill(13)], formatos: fmtPe }), 'Ponto de equilíbrio');

  // 4) Despesas por categoria (mês)
  const desp = [[`Despesas por categoria — ${tituloMes}`], ['Categoria', 'Total pago', '% das despesas']];
  dash.despesasPorCategoria.forEach((c) => desp.push([c.nome, c.total, dash.despesa > 0 ? c.total / dash.despesa : 0]));
  desp.push(['TOTAL', dash.despesa, '']);
  const fmtDesp = { '*:2': FORMATO_PCT };
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, desp, { larguras: [48, 18, 16], formatos: fmtDesp }), 'Despesas');

  // 5) Receita por cliente (mês)
  const totalClientes = dash.receitaPorCliente.reduce((s, c) => s + c.total, 0);
  const rec = [[`Receita recebida por cliente — ${tituloMes}`], ['Cliente', 'Recebido', '% da receita']];
  dash.receitaPorCliente.forEach((c) => rec.push([c.nome, c.total, totalClientes > 0 ? c.total / totalClientes : 0]));
  rec.push(['TOTAL', totalClientes, '']);
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, rec, { larguras: [60, 18, 16], formatos: { '*:2': FORMATO_PCT } }), 'Receita por cliente');

  // 6) Pendências
  const pend = [
    ['Pendências'],
    ['Lançamentos sem classificação (ano)', naoClassificado.qtd],
    ['Valor líquido sem classificação (R$)', naoClassificado.valor],
    [],
    ['Esses lançamentos não entram nas linhas da DRE até serem classificados.']
  ];
  XLSX.utils.book_append_sheet(wb, montarAba(XLSX, pend, { larguras: [42, 18], formatos: { '1:1': '0' } }), 'Pendências');

  const nome = `relatorio-gerencial_${(nomeEmpresa || 'empresa').replace(/[^\w]+/g, '-').toLowerCase()}_${ano}-${String(mes + 1).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, nome);
  return nome;
};
