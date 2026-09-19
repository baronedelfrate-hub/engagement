// Leitura e montagem do plano de contas a partir de planilha (Excel/CSV). Funções puras, sem acesso ao banco.
//
// Formato aceito: linhas com "código nome" numa célula (ex.: "1.1.01 Marketing 360") ou código e nome em células vizinhas.
// Níveis: "1." (seção) > "1.1" (categoria) > "1.1.01" (conta). Nas seções 9, 10 e 11 a categoria é o nível 1
// e as contas são o nível 2 (ex.: "9. Movimentações de sócios" > "9.1 Retirada de sócio").

// Linhas de total calculado na DRE (não são contas): ficam fora da importação.
export const SECOES_CALCULADAS = ['2', '4', '6', '8'];

// Seções em que a categoria é o nível 1 (as contas são o nível 2).
const SECOES_CATEGORIA_NIVEL_1 = ['9', '10', '11'];

// Código da categoria -> linha da DRE gerencial.
export const GRUPOS_DRE = {
  '1.1': 'receita_bruta',
  '1.2': 'deducoes',
  '3.1': 'custo_mao_obra',
  '3.2': 'custo_ferramentas',
  '3.3': 'custo_midia',
  '5.1': 'desp_administrativas',
  '5.2': 'desp_comerciais',
  '5.3': 'desp_estrutura',
  '5.4': 'desp_gerais',
  '7.1': 'receita_financeira',
  '7.2': 'desp_financeira',
  '9': 'socios',
  '10': 'investimentos',
  '11': 'emprestimos'
};

export const GRUPOS_DRE_LABELS = {
  receita_bruta: 'Receita Operacional Bruta',
  deducoes: 'Deduções da Receita',
  custo_mao_obra: 'Mão de Obra Direta',
  custo_ferramentas: 'Ferramentas Operacionais',
  custo_midia: 'Mídia e Produção',
  desp_administrativas: 'Despesas Administrativas',
  desp_comerciais: 'Despesas Comerciais',
  desp_estrutura: 'Estrutura / Infraestrutura',
  desp_gerais: 'Despesas Gerais',
  receita_financeira: 'Receitas Financeiras',
  desp_financeira: 'Despesas Financeiras',
  socios: 'Movimentações de Sócios',
  investimentos: 'Investimentos / Ativos',
  emprestimos: 'Empréstimos e Financiamentos',
  // valores antigos, ainda aceitos
  custo_servico: 'Custo dos Serviços',
  despesa_operacional: 'Despesa Operacional',
  nao_operacional: 'Não Operacional'
};

const RE_CODIGO_NOME = /^\s*(\d{1,2}(?:\.\d{1,3})*)\.?\s+(\S.*?)\s*$/;
const RE_SO_CODIGO = /^\s*(\d{1,2}(?:\.\d{1,3})*)\.?\s*$/;

const textoCelula = (v) => (v === null || v === undefined ? '' : String(v).trim());

export const normalizarCodigo = (codigo) => String(codigo).trim().replace(/\.+$/, '');
export const nivelDoCodigo = (codigo) => normalizarCodigo(codigo).split('.').length;
const secaoDoCodigo = (codigo) => normalizarCodigo(codigo).split('.')[0];
const paiDoCodigo = (codigo) => {
  const partes = normalizarCodigo(codigo).split('.');
  return partes.length > 1 ? partes.slice(0, -1).join('.') : null;
};

// Ordenação natural por código (1.2 antes de 1.10).
export const compararCodigos = (a, b) => {
  const pa = normalizarCodigo(a).split('.').map(Number);
  const pb = normalizarCodigo(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
};

/**
 * Converte as linhas de uma planilha em itens { codigo, nome }.
 * Retorna também as linhas ignoradas (comentários, títulos) para mostrar na pré-visualização.
 */
export const lerLinhasPlano = (linhas) => {
  const itens = [];
  const ignoradas = [];
  const vistos = new Set();

  linhas.forEach((linha, idx) => {
    const celulas = (linha || []).map(textoCelula);
    let item = null;

    for (let i = 0; i < celulas.length && !item; i++) {
      const c = celulas[i];
      if (!c) continue;
      const m = c.match(RE_CODIGO_NOME);
      if (m) {
        item = { codigo: normalizarCodigo(m[1]), nome: m[2] };
      } else if (RE_SO_CODIGO.test(c)) {
        const proxima = celulas.slice(i + 1).find(x => x);
        if (proxima && !RE_SO_CODIGO.test(proxima)) item = { codigo: normalizarCodigo(c), nome: proxima };
      }
    }

    if (item) {
      if (vistos.has(item.codigo)) {
        ignoradas.push({ linha: idx + 1, texto: `${item.codigo} ${item.nome}`, motivo: 'código repetido' });
      } else {
        vistos.add(item.codigo);
        itens.push({ ...item, linha: idx + 1 });
      }
    } else {
      const texto = celulas.find(x => x);
      if (texto) ignoradas.push({ linha: idx + 1, texto, motivo: 'não é uma conta' });
    }
  });

  return { itens, ignoradas };
};

const tipoENatureza = (codigo, grupoDre) => {
  const secao = secaoDoCodigo(codigo);
  if (grupoDre === 'deducoes') return { tipo: 'Receita', natureza: 'Devedora' };
  if (secao === '1') return { tipo: 'Receita', natureza: 'Credora' };
  if (secao === '3') return { tipo: 'Custo', natureza: 'Devedora' };
  if (secao === '5') return { tipo: 'Despesa', natureza: 'Devedora' };
  if (secao === '7') return grupoDre === 'receita_financeira'
    ? { tipo: 'Receita', natureza: 'Credora' }
    : { tipo: 'Despesa', natureza: 'Devedora' };
  if (secao === '9') return { tipo: 'Patrimônio', natureza: normalizarCodigo(codigo) === '9.3' ? 'Credora' : 'Devedora' };
  if (secao === '10') return { tipo: 'Ativo', natureza: 'Devedora' };
  if (secao === '11') return { tipo: 'Passivo', natureza: 'Credora' };
  return { tipo: null, natureza: null };
};

// Código da categoria à qual o item pertence (ou o próprio item, se ele for a categoria).
const codigoDaCategoria = (codigo) => {
  const partes = normalizarCodigo(codigo).split('.');
  const secao = partes[0];
  if (SECOES_CATEGORIA_NIVEL_1.includes(secao)) return secao;
  return partes.length >= 2 ? partes.slice(0, 2).join('.') : null;
};

/**
 * A partir dos itens lidos, monta as três projeções do plano:
 * - contas: todas as contas da hierarquia (Contabilidade), com pai e analítica/sintética;
 * - categorias: nível de agrupamento usado no Financeiro e na DRE;
 * - subcategorias: contas dentro de cada categoria.
 */
export const montarPlano = (itensLidos) => {
  const calculadas = [];
  const itens = [];
  itensLidos.forEach((it) => {
    const secao = secaoDoCodigo(it.codigo);
    if (nivelDoCodigo(it.codigo) === 1 && SECOES_CALCULADAS.includes(secao)) calculadas.push(it);
    else itens.push(it);
  });

  const codigos = new Set(itens.map(i => i.codigo));
  const temFilhos = new Set();
  itens.forEach((i) => {
    const pai = paiDoCodigo(i.codigo);
    if (pai) temFilhos.add(pai);
  });

  const contas = itens
    .slice()
    .sort((a, b) => compararCodigos(a.codigo, b.codigo))
    .map((i) => {
      const codCat = codigoDaCategoria(i.codigo);
      const grupoDre = codCat ? (GRUPOS_DRE[codCat] || null) : null;
      const { tipo, natureza } = tipoENatureza(i.codigo, grupoDre);
      const pai = paiDoCodigo(i.codigo);
      return {
        codigo: i.codigo,
        nome: i.nome,
        nivel: nivelDoCodigo(i.codigo),
        codigo_pai: pai && codigos.has(pai) ? pai : null,
        analitica: !temFilhos.has(i.codigo),
        tipo,
        natureza,
        grupo_dre: grupoDre
      };
    });

  const categorias = [];
  const subcategorias = [];
  contas.forEach((c) => {
    const secao = secaoDoCodigo(c.codigo);
    const nivelCategoria = SECOES_CATEGORIA_NIVEL_1.includes(secao) ? 1 : 2;
    if (c.nivel === nivelCategoria) {
      categorias.push({ codigo: c.codigo, nome: c.nome, grupo_dre: c.grupo_dre, ordem: categorias.length + 1 });
    } else if (c.nivel > nivelCategoria) {
      subcategorias.push({ codigo: c.codigo, nome: c.nome, codigo_categoria: codigoDaCategoria(c.codigo) });
    }
  });

  return { contas, categorias, subcategorias, calculadas };
};

// Modelo de planilha para download (mesmo formato aceito na importação).
export const LINHAS_MODELO = [
  ['Estrutura de Plano de Contas'],
  [],
  ['1. RECEITAS'],
  ['1.1 Receita Operacional Bruta'],
  ['1.1.01 Serviço recorrente (mensal)'],
  ['1.1.02 Serviço avulso'],
  ['1.2 Deduções da Receita'],
  ['1.2.01 Impostos sobre faturamento'],
  ['3. CUSTOS DIRETOS'],
  ['3.1 Mão de Obra Direta'],
  ['3.1.01 Salários equipe operacional'],
  ['5. DESPESAS OPERACIONAIS'],
  ['5.1 Despesas Administrativas'],
  ['5.1.01 Contabilidade'],
  ['7. RESULTADO FINANCEIRO'],
  ['7.2 Despesas financeiras'],
  ['7.2.01 Taxas bancárias']
];
