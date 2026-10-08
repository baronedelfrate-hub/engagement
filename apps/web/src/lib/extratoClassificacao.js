// Leitura do extrato do Asaas e de-para (regras) de classificação. Funções puras, sem acesso a banco.

export const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normalizar = (s) => semAcento(s).toUpperCase().replace(/\s+/g, ' ').trim();
export const tipoNorm = normalizar;

const MESES = '(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*';
const RE_REF = new RegExp(`\\bREF\\b\\.?(?:\\s+${MESES})?(?:\\s+\\d{2,4})?`, 'g');

// Assinatura da descrição: o que identifica o favorecido/cliente, sem números, datas de referência
// ("REF. JAN 2026"), nº de fatura ou de nota. Duas descrições do mesmo favorecido têm a mesma assinatura.
export const assinaturaDe = (descricao) =>
  normalizar(descricao)
    .replace(RE_REF, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[.,\-/()*:;#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// "Cobrança recebida - fatura nr. 691447057 SANTO TOMAS INDUSTRIAS. Nota fiscal nr. 347" -> "SANTO TOMAS INDUSTRIAS"
export const extrairCliente = (descricao, tipo) => {
  if (!tipoNorm(tipo).startsWith('COBRANCA RECEBIDA')) return null;
  const m = /fatura\s+nr\.?\s*\d+\s+(.+?)(?:\.?\s*Nota fiscal.*)?$/i.exec(String(descricao || ''));
  const nome = m?.[1]?.replace(/[.\s]+$/, '').trim();
  return nome || null;
};

export const parseValor = (v) => {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return NaN;
  let s = String(v).replace(/R\$|\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return Number(s);
};

const dois = (n) => String(n).padStart(2, '0');

export const parseData = (v) => {
  if (v instanceof Date && !isNaN(v)) {
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const br = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
    if (br) return `${br[3]}-${dois(br[2])}-${dois(br[1])}`;
    const iso = /^\s*(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  return null;
};

const COLUNAS = {
  data: ['DATA'],
  id: ['TRANSACAO'],
  tipo: ['TIPO DE TRANSACAO'],
  estornada: ['TRANSACAO ESTORNADA'],
  descricao: ['DESCRICAO'],
  valor: ['VALOR'],
  saldo: ['SALDO'],
  nota: ['NOTA FISCAL'],
  categoria: ['CATEGORIA'],
  subcategoria: ['SUBCATEGORIA'],
  centro: ['CENTRO DE CUSTOS', 'CENTRO DE CUSTO'],
  cliente: ['CLIENTE (RECEITA)', 'CLIENTE']
};

// matriz: linhas da planilha (array de arrays). Acha o cabeçalho (Data / Descrição / Valor) e lê cada lançamento.
export const lerExtratoAsaas = (matriz) => {
  const idxCab = matriz.slice(0, 20).findIndex((r) => {
    const cel = (r || []).map(normalizar);
    return cel.includes('DATA') && cel.includes('DESCRICAO') && cel.includes('VALOR');
  });
  if (idxCab < 0) throw new Error('Não encontrei o cabeçalho do extrato (colunas Data, Descrição e Valor).');

  const cab = matriz[idxCab].map(normalizar);
  const col = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) col[campo] = cab.findIndex((c) => nomes.includes(c));

  const linhas = [];
  const vistos = new Map();
  let ignoradas = 0;
  let temClassificacao = false;

  for (const r of matriz.slice(idxCab + 1)) {
    const get = (campo) => (col[campo] >= 0 ? r?.[col[campo]] : null);
    const data = parseData(get('data'));
    const valor = parseValor(get('valor'));
    if (!data || isNaN(valor)) { if ((r || []).some((c) => c != null && c !== '')) ignoradas++; continue; }

    const descricao = String(get('descricao') ?? '').trim();
    const tipo = String(get('tipo') ?? '').trim();
    const assinatura = assinaturaDe(descricao);
    let id = String(get('id') ?? '').trim();
    if (!id) {
      const base = `${data}|${valor}|${assinatura}`;
      const n = (vistos.get(base) || 0) + 1;
      vistos.set(base, n);
      id = `SEM-ID-${base}|${n}`;
    }
    const txt = (campo) => { const v = get(campo); return v == null || v === '' ? null : String(v).trim(); };
    const arquivo = { categoria: txt('categoria'), subcategoria: txt('subcategoria'), centro: txt('centro'), cliente: txt('cliente') };
    if (arquivo.categoria || arquivo.subcategoria) temClassificacao = true;

    const saldo = parseValor(get('saldo'));
    linhas.push({
      data_transacao: data,
      descricao,
      valor,
      saldo_posterior: isNaN(saldo) ? null : saldo,
      numero_documento: id,
      tipo_transacao: tipo,
      tipo_norm: tipoNorm(tipo),
      nota_fiscal: txt('nota'),
      estornada: !!txt('estornada'),
      assinatura,
      arquivo
    });
  }
  return { linhas, ignoradas, temClassificacao };
};

// ---- Catálogo (categorias / subcategorias / centros) ----

const codigoDoTexto = (texto) => /^\s*(\d{1,2}(?:\.\d{1,3})*)\.?\s/.exec(String(texto || ''))?.[1] || null;

const resolver = (texto, lista) => {
  if (!texto) return null;
  const cod = codigoDoTexto(texto);
  if (cod) return lista.find((i) => i.codigo === cod) || null;
  const n = normalizar(texto);
  return lista.find((i) => normalizar(i.nome) === n) || null;
};

// Converte o texto da planilha ("5.1 Despesas Administrativas" / "5.1.06 Mensageria...") em ids do cadastro.
// "A CLASSIFICAR" e textos sem correspondência ficam sem classificação.
export const classificacaoDoArquivo = (arquivo, catalogo) => {
  const sub = resolver(arquivo.subcategoria, catalogo.subcategorias);
  const cat = sub ? catalogo.categorias.find((c) => c.id === sub.categoria_id) : resolver(arquivo.categoria, catalogo.categorias);
  const cc = resolver(arquivo.centro, catalogo.centros);
  return {
    categoria_id: cat?.id || null,
    subcategoria_id: sub?.id || null,
    centro_custo_id: cc?.id || null,
    cliente_nome: arquivo.cliente || null
  };
};

const temClassificacao = (c) => !!c.categoria_id;
const chaveClass = (c) => `${c.categoria_id || ''}|${c.subcategoria_id || ''}|${c.centro_custo_id || ''}`;
export const chaveRegra = (tipo, assinatura) => `${tipo}||${assinatura || ''}`;

// Regras novas a partir de linhas já classificadas. Tipo com uma única classificação vira regra por tipo;
// tipo com várias (ex.: Pix, Pagamento de conta) vira regra por favorecido (assinatura) quando ela é inequívoca.
// Regras que já existem não são tocadas.
export const aprenderRegras = (linhas, regrasExistentes = []) => {
  const existentes = new Set(regrasExistentes.map((r) => chaveRegra(r.tipo_norm, r.assinatura)));
  const porTipo = new Map();
  for (const l of linhas) {
    if (!l.classificacao || !temClassificacao(l.classificacao)) continue;
    if (!porTipo.has(l.tipo_norm)) porTipo.set(l.tipo_norm, []);
    porTipo.get(l.tipo_norm).push(l);
  }
  const novas = [];
  const add = (tipo, assinatura, c) => {
    const k = chaveRegra(tipo, assinatura);
    if (existentes.has(k)) return;
    existentes.add(k);
    novas.push({
      tipo_norm: tipo,
      assinatura,
      categoria_id: c.categoria_id,
      subcategoria_id: c.subcategoria_id,
      centro_custo_id: c.centro_custo_id,
      cliente_nome: assinatura ? c.cliente_nome : null
    });
  };
  for (const [tipo, ls] of porTipo) {
    const distintas = new Set(ls.map((l) => chaveClass(l.classificacao)));
    if (distintas.size === 1) { add(tipo, null, ls[0].classificacao); continue; }
    const porAss = new Map();
    for (const l of ls) {
      if (!l.assinatura) continue;
      if (!porAss.has(l.assinatura)) porAss.set(l.assinatura, []);
      porAss.get(l.assinatura).push(l);
    }
    for (const [ass, g] of porAss) {
      if (new Set(g.map((l) => chaveClass(l.classificacao))).size === 1) add(tipo, ass, g[0].classificacao);
    }
  }
  return novas;
};

// Regra mais específica primeiro (favorecido), depois a do tipo.
export const classificarPorRegras = (linha, regras) => {
  const idx = new Map(regras.map((r) => [chaveRegra(r.tipo_norm, r.assinatura), r]));
  const r = idx.get(chaveRegra(linha.tipo_norm, linha.assinatura)) || idx.get(chaveRegra(linha.tipo_norm, null));
  return r ? { regra: r, classificacao: { categoria_id: r.categoria_id, subcategoria_id: r.subcategoria_id, centro_custo_id: r.centro_custo_id, cliente_nome: r.cliente_nome || null } } : null;
};

// Aplica arquivo -> regras (existentes + aprendidas do arquivo) a cada linha.
export const prepararLinhas = (linhas, catalogo, regrasExistentes, { usarArquivo }) => {
  let prep = linhas.map((l) => ({ ...l, classificacao: null, origem: null }));
  let regrasNovas = [];
  if (usarArquivo) {
    prep = prep.map((l) => {
      const c = classificacaoDoArquivo(l.arquivo, catalogo);
      return temClassificacao(c) ? { ...l, classificacao: c, origem: 'arquivo' } : l;
    });
    regrasNovas = aprenderRegras(prep, regrasExistentes);
  }
  const todas = [...regrasExistentes, ...regrasNovas];
  prep = prep.map((l) => {
    let cls = l.classificacao;
    let origem = l.origem;
    let regra = null;
    if (!cls) {
      const hit = classificarPorRegras(l, todas);
      if (hit) { cls = hit.classificacao; origem = 'regra'; regra = hit.regra; }
    }
    const cliente = cls?.cliente_nome || l.arquivo.cliente || extrairCliente(l.descricao, l.tipo_transacao);
    return { ...l, classificacao: cls ? { ...cls, cliente_nome: cliente } : (cliente ? { categoria_id: null, subcategoria_id: null, centro_custo_id: null, cliente_nome: cliente } : null), origem, regra };
  });
  return { linhas: prep, regrasNovas };
};
