// DRE gerencial, Ponto de Equilíbrio e agregações do Dashboard a partir do extrato classificado (regime de caixa).
// Funções puras. Valores do extrato: entradas positivas, saídas negativas (como na planilha da Criade).

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Linhas da DRE na ordem da planilha. tipo: 'grupo' (soma de uma categoria), 'subtotal' (calculado), 'fora' (fora da DRE).
export const ESTRUTURA_DRE = [
  { chave: 'receita_bruta', codigo: '1.1', tipo: 'grupo' },
  { chave: 'deducoes', codigo: '1.2', tipo: 'grupo' },
  { chave: 'receita_liquida', rotulo: 'RECEITA LÍQUIDA', tipo: 'subtotal', soma: ['receita_bruta', 'deducoes'] },
  { chave: 'custo_mao_obra', codigo: '3.1', tipo: 'grupo' },
  { chave: 'custo_ferramentas', codigo: '3.2', tipo: 'grupo' },
  { chave: 'custo_midia', codigo: '3.3', tipo: 'grupo' },
  { chave: 'custo_deslocamento', codigo: '3.4', tipo: 'grupo' },
  { chave: 'custo_comissoes', codigo: '3.5', tipo: 'grupo' },
  { chave: 'lucro_bruto', rotulo: 'LUCRO BRUTO', tipo: 'subtotal', soma: ['receita_liquida', 'custo_mao_obra', 'custo_ferramentas', 'custo_midia', 'custo_deslocamento', 'custo_comissoes'] },
  { chave: 'desp_administrativas', codigo: '5.1', tipo: 'grupo' },
  { chave: 'desp_comerciais', codigo: '5.2', tipo: 'grupo' },
  { chave: 'desp_estrutura', codigo: '5.3', tipo: 'grupo' },
  { chave: 'desp_gerais', codigo: '5.4', tipo: 'grupo' },
  // opcional: só aparece quando a empresa escolhe tratar as retiradas dos sócios (9.2) como despesa
  { chave: 'remuneracao_socios', codigo: '9.2', tipo: 'grupo', opcional: true },
  { chave: 'resultado_operacional', rotulo: 'RESULTADO OPERACIONAL', tipo: 'subtotal', soma: ['lucro_bruto', 'desp_administrativas', 'desp_comerciais', 'desp_estrutura', 'desp_gerais', 'remuneracao_socios'] },
  { chave: 'receita_financeira', codigo: '7.1', tipo: 'grupo' },
  { chave: 'desp_financeira', codigo: '7.2', tipo: 'grupo' },
  { chave: 'lucro_liquido', rotulo: 'LUCRO LÍQUIDO', tipo: 'subtotal', soma: ['resultado_operacional', 'receita_financeira', 'desp_financeira'] },
  { chave: 'socios', codigo: '9', tipo: 'fora' },
  { chave: 'investimentos', codigo: '10', tipo: 'fora' },
  { chave: 'emprestimos', codigo: '11', tipo: 'fora' },
  // neutros: dinheiro que só passa pela empresa (repasse de clientes, transferências entre contas); fora do resultado e do caixa
  { chave: 'repasse_clientes', codigo: '12', tipo: 'neutro' },
  { chave: 'transferencias', codigo: '13', tipo: 'neutro' },
  { chave: 'nao_classificado', rotulo: 'Ainda não classificado (pendente de revisão)', tipo: 'fora' }
];

export const ROTULOS_GRUPO = {
  receita_bruta: 'Receita Operacional Bruta',
  deducoes: 'Deduções da Receita',
  custo_mao_obra: 'Mão de Obra Direta',
  custo_ferramentas: 'Ferramentas Operacionais',
  custo_midia: 'Mídia e Produção',
  custo_deslocamento: 'Deslocamento',
  custo_comissoes: 'Comissões',
  desp_administrativas: 'Despesas Administrativas',
  desp_comerciais: 'Despesas Comerciais',
  desp_estrutura: 'Estrutura / Infraestrutura',
  desp_gerais: 'Despesas Gerais',
  remuneracao_socios: 'Remuneração dos sócios (retiradas)',
  receita_financeira: 'Receitas Financeiras',
  desp_financeira: 'Despesas Financeiras',
  socios: 'Movimentações de Sócios',
  investimentos: 'Investimentos / Ativos',
  emprestimos: 'Empréstimos e Financiamentos',
  repasse_clientes: 'Recursos de clientes para obras (repasse)',
  transferencias: 'Transferências'
};

// Custos cujo significado muda de uma empresa para outra: a linha da DRE usa o nome da categoria cadastrada na empresa.
const GRUPOS_COM_NOME_DA_EMPRESA = new Set(['custo_ferramentas', 'custo_midia', 'custo_deslocamento', 'custo_comissoes']);

const GRUPOS_CONHECIDOS = new Set(ESTRUTURA_DRE.filter((l) => l.tipo !== 'subtotal' && l.chave !== 'nao_classificado').map((l) => l.chave));
const zeros = () => Array(12).fill(0);
const soma = (a) => a.reduce((s, v) => s + v, 0);
const arred = (v) => Math.round(v * 100) / 100;

// Em qual linha da DRE cai o lançamento (sem categoria, ou categoria sem linha da DRE = não classificado).
export const grupoDoLancamento = (mov, categoriasPorId) => {
  const g = categoriasPorId.get(mov.categoria_id)?.grupo_dre;
  return GRUPOS_CONHECIDOS.has(g) ? g : 'nao_classificado';
};

// movs: [{ data_transacao 'yyyy-mm-dd', valor, categoria_id, subcategoria_id }]
export const montarDRE = (movs, { ano, categorias, subcategorias, retiradasComoDespesa = false }) => {
  const catPorId = new Map(categorias.map((c) => [c.id, c]));
  const subPorId = new Map(subcategorias.map((s) => [s.id, s]));
  const grupos = {};
  for (const l of ESTRUTURA_DRE) if (l.tipo !== 'subtotal') grupos[l.chave] = { valores: zeros(), ent: zeros(), sai: zeros(), detalhes: new Map() };

  for (const m of movs) {
    if (!m.data_transacao || Number(m.data_transacao.slice(0, 4)) !== ano) continue;
    const mes = Number(m.data_transacao.slice(5, 7)) - 1;
    let g = grupoDoLancamento(m, catPorId);
    const valor = Number(m.valor) || 0;
    const sub = subPorId.get(m.subcategoria_id);
    // retiradas/adiantamentos a sócio (9.2) viram remuneração dos sócios, dentro do resultado operacional
    if (retiradasComoDespesa && g === 'socios' && sub?.codigo && String(sub.codigo).startsWith('9.2')) g = 'remuneracao_socios';
    grupos[g].valores[mes] += valor;
    if (valor >= 0) grupos[g].ent[mes] += valor; else grupos[g].sai[mes] += valor;

    const cat = catPorId.get(m.categoria_id);
    const chaveDet = sub ? sub.id : cat ? `cat:${cat.id}` : 'sem';
    const rotuloDet = sub ? `${sub.codigo || ''} ${sub.nome}`.trim() : cat ? `${cat.codigo || ''} ${cat.nome} — sem subcategoria`.trim() : 'Sem categoria';
    if (!grupos[g].detalhes.has(chaveDet)) grupos[g].detalhes.set(chaveDet, { id: chaveDet, rotulo: rotuloDet, valores: zeros() });
    grupos[g].detalhes.get(chaveDet).valores[mes] += valor;
  }

  const porChave = {};
  const linhas = ESTRUTURA_DRE.map((def) => {
    let valores;
    let detalhes = [];
    if (def.tipo === 'subtotal') {
      valores = zeros().map((_, i) => def.soma.reduce((s, k) => s + porChave[k].valores[i], 0));
    } else {
      valores = grupos[def.chave].valores;
      detalhes = [...grupos[def.chave].detalhes.values()]
        .map((d) => ({ ...d, total: arred(soma(d.valores)) }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true }));
    }
    const nomeDaEmpresa = GRUPOS_COM_NOME_DA_EMPRESA.has(def.chave)
      ? categorias.find((c) => c.grupo_dre === def.chave && c.nome)?.nome
      : null;
    const foraDaDRE = def.tipo === 'fora' || def.tipo === 'neutro';
    const rotulo = def.rotulo || `${def.codigo}${foraDaDRE && def.codigo.length <= 2 ? '.' : ''} ${nomeDaEmpresa || ROTULOS_GRUPO[def.chave]}`;
    const linha = { chave: def.chave, tipo: def.tipo, rotulo, valores: valores.map(arred), total: arred(soma(valores)), detalhes };
    if (def.tipo !== 'subtotal') {
      linha.entradas = grupos[def.chave].ent.map(arred);
      linha.saidas = grupos[def.chave].sai.map(arred);
    }
    porChave[def.chave] = linha;
    return linha;
  }).filter((l) => !(ESTRUTURA_DRE.find((d) => d.chave === l.chave)?.opcional && !retiradasComoDespesa));

  // movimentação líquida do caixa = lucro líquido + tudo que fica fora da DRE (sócios, investimentos, empréstimos, não classificado)
  const compoeCaixa = linhas.filter((l) => l.chave === 'lucro_liquido' || l.tipo === 'fora');
  const movimentacao = zeros().map((_, i) => arred(compoeCaixa.reduce((s, l) => s + l.valores[i], 0)));
  const conferencia = { valores: movimentacao, total: arred(soma(movimentacao)) };

  // Resultado de caixa: do lucro líquido à geração de caixa do mês (repasses e transferências ficam de fora)
  const itensCaixa = [
    ['lucro_liquido', 'Lucro líquido', porChave.lucro_liquido.valores],
    ['amortizacao', '(−) Amortização de empréstimos', porChave.emprestimos.saidas],
    ['captacao', '(+) Captação de empréstimos', porChave.emprestimos.entradas],
    ['investimentos', '(±) Investimentos e aplicações (líquido)', porChave.investimentos.valores],
    ['retiradas', '(−) Distribuição e retiradas dos sócios', porChave.socios.saidas],
    ['aportes', '(+) Aportes dos sócios', porChave.socios.entradas]
  ];
  if (porChave.nao_classificado.total !== 0) itensCaixa.push(['nao_classificado', 'Ainda não classificado (pendente de revisão)', porChave.nao_classificado.valores]);
  const caixaLinhas = itensCaixa.map(([chave, rotulo, v]) => ({ chave, rotulo, valores: v.map(arred), total: arred(soma(v)) }));
  const geracaoValores = zeros().map((_, i) => arred(caixaLinhas.reduce((t, l) => t + l.valores[i], 0)));
  const caixa = { linhas: caixaLinhas, geracao: { valores: geracaoValores, total: arred(soma(geracaoValores)) } };

  return { ano, linhas, porChave, conferencia, caixa };
};

// Ponto de Equilíbrio, com as fórmulas da planilha. Total usa os totais do período (não a soma dos meses).
export const calcularPE = (dre) => {
  const v = (k, i) => (i === 'total' ? dre.porChave[k].total : dre.porChave[k].valores[i]);
  const calc = (i) => {
    const receita = v('receita_bruta', i);
    const variaveis = -(v('custo_mao_obra', i) + v('custo_ferramentas', i) + v('custo_midia', i) + v('custo_deslocamento', i) + v('custo_comissoes', i) + v('deducoes', i));
    const fixos = -(v('desp_administrativas', i) + v('desp_comerciais', i) + v('desp_estrutura', i) + v('desp_gerais', i) + v('desp_financeira', i));
    const mc = receita - variaveis;
    const mcPct = receita > 0 ? mc / receita : 0;
    const pe = mcPct > 0 ? fixos / mcPct : 0;
    const temDado = receita !== 0 || variaveis !== 0 || fixos !== 0;
    return {
      receita: arred(receita), variaveis: arred(variaveis), fixos: arred(fixos), mc: arred(mc), mcPct, pe: arred(pe),
      situacao: !temDado ? '' : receita >= pe ? 'Acima do PE' : 'Abaixo do PE'
    };
  };
  return { meses: Array.from({ length: 12 }, (_, i) => calc(i)), total: calc('total') };
};

// Ponto de equilíbrio de um intervalo de meses (0 = jan ... 11 = dez), somando o período e aplicando a mesma fórmula.
// Devolve também quanto a receita ficou acima ou abaixo do PE (folga), a cobertura (receita ÷ PE) e a margem de segurança.
export const calcularPEPeriodo = (dre, de, ate, { incluirSocios = false } = {}) => {
  const soma = (k) => dre.porChave[k].valores.slice(de, ate + 1).reduce((s, x) => s + x, 0);
  const receita = soma('receita_bruta');
  const variaveis = -(soma('custo_mao_obra') + soma('custo_ferramentas') + soma('custo_midia') + soma('custo_deslocamento') + soma('custo_comissoes') + soma('deducoes'));
  const fixosBase = -(soma('desp_administrativas') + soma('desp_comerciais') + soma('desp_estrutura') + soma('desp_gerais') + soma('desp_financeira'));
  // retiradas de sócios (grupo 9): ficam fora do PE, a menos que a empresa queira tratá-las como custo fixo
  const retiradasSocios = -soma('socios');
  const fixos = fixosBase + (incluirSocios ? retiradasSocios : 0);
  const mc = receita - variaveis;
  const mcPct = receita > 0 ? mc / receita : 0;
  const peImpossivel = fixos > 0 && mcPct <= 0; // margem de contribuição não cobre nem os custos variáveis
  const pe = mcPct > 0 ? fixos / mcPct : 0;
  const folga = receita - pe;
  return {
    receita: arred(receita), variaveis: arred(variaveis), fixos: arred(fixos), mc: arred(mc), mcPct, pe: arred(pe),
    incluiuSocios: incluirSocios,
    retiradasSocios: arred(retiradasSocios),
    peSemSocios: arred(mcPct > 0 ? fixosBase / mcPct : 0),
    folga: arred(folga),
    // ponto de equilíbrio financeiro: soma as parcelas pagas de empréstimos (amortização, grupo 11) aos custos fixos
    ...(() => {
      const parcelas = -dre.porChave.emprestimos.saidas.slice(de, ate + 1).reduce((s, x) => s + x, 0);
      const peFin = mcPct > 0 ? (fixos + parcelas) / mcPct : 0;
      return {
        parcelasEmprestimos: arred(parcelas),
        peFinanceiro: arred(peFin),
        folgaFinanceira: arred(receita - peFin),
        acimaFinanceiro: !(fixos + parcelas > 0 && mcPct <= 0) && receita >= peFin
      };
    })(),
    cobertura: pe > 0 ? receita / pe : null,
    margemSeguranca: receita > 0 ? folga / receita : 0,
    resultado: arred(mc - fixos),
    acima: !peImpossivel && receita >= pe,
    peImpossivel,
    temDado: receita !== 0 || variaveis !== 0 || fixos !== 0
  };
};

// Dashboard: despesas por categoria (líquido das saídas) e receita recebida por cliente.
export const agregarDashboard = (movs, { categorias, subcategorias, de, ate }) => {
  const catPorId = new Map(categorias.map((c) => [c.id, c]));
  const doPeriodo = movs.filter((m) => (!de || m.data_transacao >= de) && (!ate || m.data_transacao <= ate));

  const porCategoria = new Map();
  const porCliente = new Map();
  let receita = 0;
  let despesa = 0;
  for (const m of doPeriodo) {
    const valor = Number(m.valor) || 0;
    const g = grupoDoLancamento(m, catPorId);
    const cat = catPorId.get(m.categoria_id);
    const ehReceita = g === 'receita_bruta' || g === 'receita_financeira';
    if (ehReceita) {
      receita += valor;
      if (g === 'receita_bruta') {
        const nome = (m.cliente_nome || '').trim() || 'Sem cliente informado';
        porCliente.set(nome, (porCliente.get(nome) || 0) + valor);
      }
    } else {
      despesa += -valor;
      const chave = g === 'nao_classificado' ? 'A CLASSIFICAR' : `${cat.codigo || ''} ${cat.nome}`.trim();
      porCategoria.set(chave, (porCategoria.get(chave) || 0) - valor);
    }
  }
  const ordenar = (mapa) => [...mapa.entries()].map(([nome, total]) => ({ nome, total: arred(total) })).sort((a, b) => b.total - a.total);
  return {
    despesasPorCategoria: ordenar(porCategoria).filter((c) => c.total > 0),
    receitaPorCliente: ordenar(porCliente).filter((c) => c.total > 0),
    receita: arred(receita),
    despesa: arred(despesa)
  };
};
