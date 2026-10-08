import { supabase } from '@/lib/customSupabaseClient';
import { lerExtratoAsaas, prepararLinhas, tipoNorm, assinaturaDe } from '@/lib/extratoClassificacao';
import { parseExtratoFile } from '@/services/extratoImportService';

const EM_LOTES = 200;
const lotes = (lista, n = EM_LOTES) => {
  const out = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
};

// O Supabase devolve no máximo 1000 linhas por consulta; lê tudo em páginas.
export const buscarTudo = async (montar) => {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar().range(de, de + 999);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return todas;
};

export const lerArquivoExtrato = async (arquivo) => {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith('.ofx')) {
    const vistos = new Map();
    const linhas = (await parseExtratoFile(arquivo)).map((t) => {
      const assinatura = assinaturaDe(t.descricao);
      let id = t.numero_documento;
      if (!id) {
        const base = `${t.data_transacao}|${t.valor}|${assinatura}`;
        const n = (vistos.get(base) || 0) + 1;
        vistos.set(base, n);
        id = `SEM-ID-${base}|${n}`;
      }
      return { ...t, numero_documento: id, saldo_posterior: null, tipo_norm: tipoNorm(t.tipo_transacao), nota_fiscal: null, estornada: false, assinatura, arquivo: {} };
    });
    return { linhas, ignoradas: 0, temClassificacao: false, aba: null };
  }
  if (!/\.(xlsx|xls|csv)$/.test(nome)) throw new Error('Formato não suportado. Use .xlsx, .xls ou .csv do Asaas (ou .ofx).');
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
  const aba = wb.SheetNames.find((n) => normalizarNome(n) === 'EXTRATOS') || wb.SheetNames[0];
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: null });
  return { ...lerExtratoAsaas(matriz), aba };
};

const normalizarNome = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

export const carregarCatalogo = async (companyId) => {
  const [cat, sub, cc, regras, clientes] = await Promise.all([
    supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', companyId).order('codigo'),
    supabase.from('subcategorias').select('id, codigo, nome, categoria_id').eq('company_id', companyId).order('codigo'),
    supabase.from('centros_custo').select('id, codigo, nome').eq('company_id', companyId).order('nome'),
    supabase.from('extrato_regras').select('*').eq('company_id', companyId),
    supabase.from('clientes').select('nome').eq('company_id', companyId).order('nome')
  ]);
  for (const r of [cat, sub, cc, regras]) if (r.error) throw r.error;
  return {
    categorias: cat.data || [],
    subcategorias: sub.data || [],
    centros: cc.data || [],
    regras: regras.data || [],
    clientes: (clientes.data || []).map((c) => c.nome).filter(Boolean)
  };
};

export const idsJaImportados = async (companyId, bancoId, ids) => {
  const existentes = new Set();
  for (const lote of lotes(ids, 150)) {
    const { data, error } = await supabase
      .from('extrato_bancario')
      .select('numero_documento')
      .eq('company_id', companyId)
      .eq('banco_id', bancoId)
      .in('numero_documento', lote);
    if (error) throw error;
    (data || []).forEach((r) => existentes.add(r.numero_documento));
  }
  return existentes;
};

export const classificarLinhasDoArquivo = (linhas, catalogo, usarArquivo) =>
  prepararLinhas(linhas, catalogo, catalogo.regras, { usarArquivo });

export const salvarImportacao = async ({ companyId, bancoId, linhas, regrasNovas, userId }) => {
  const ja = await idsJaImportados(companyId, bancoId, linhas.map((l) => l.numero_documento));
  const novas = linhas.filter((l) => !ja.has(l.numero_documento));

  // regras primeiro, para poder guardar o regra_id nas linhas
  const idRegra = new Map();
  if (regrasNovas.length) {
    const { data, error } = await supabase
      .from('extrato_regras')
      .insert(regrasNovas.map((r) => ({ ...r, company_id: companyId, created_by: userId || null })))
      .select('id, tipo_norm, assinatura');
    if (error && error.code !== '23505') throw error;
    (data || []).forEach((r) => idRegra.set(`${r.tipo_norm}||${r.assinatura || ''}`, r.id));
  }

  for (const lote of lotes(novas)) {
    const payload = lote.map((l) => ({
      company_id: companyId,
      banco_id: bancoId,
      data_transacao: l.data_transacao,
      descricao: l.descricao,
      valor: l.valor,
      saldo_posterior: l.saldo_posterior,
      numero_documento: l.numero_documento,
      tipo_transacao: l.tipo_transacao,
      tipo_norm: l.tipo_norm,
      assinatura: l.assinatura,
      nota_fiscal: l.nota_fiscal,
      estornada: l.estornada,
      status_conciliacao: 'Não Conciliado',
      categoria_id: l.classificacao?.categoria_id || null,
      subcategoria_id: l.classificacao?.subcategoria_id || null,
      centro_custo_id: l.classificacao?.centro_custo_id || null,
      cliente_nome: l.classificacao?.cliente_nome || null,
      classificacao_origem: l.classificacao?.categoria_id ? l.origem : null,
      regra_id: l.regra ? l.regra.id || idRegra.get(`${l.regra.tipo_norm}||${l.regra.assinatura || ''}`) || null : null
    }));
    const { error } = await supabase.from('extrato_bancario').insert(payload);
    if (error) throw error;
  }

  return {
    novas: novas.length,
    duplicadas: linhas.length - novas.length,
    classificadas: novas.filter((l) => l.classificacao?.categoria_id).length,
    aClassificar: novas.filter((l) => !l.classificacao?.categoria_id).length,
    regrasCriadas: regrasNovas.length
  };
};

// ---- Gerar movimentações financeiras (títulos + baixas) a partir do extrato classificado ----

const CAMPOS_EXTRATO = 'id, banco_id, data_transacao, descricao, valor, tipo_norm, numero_documento, nota_fiscal, categoria_id, subcategoria_id, centro_custo_id, cliente_nome';

// Lançamentos classificados que ainda não têm baixa ligada, mais os cadastros necessários para casar nomes.
export const carregarBaseGeracao = async (companyId) => {
  const [extrato, ligadas, clientes, fornecedores, categorias] = await Promise.all([
    buscarTudo(() => supabase.from('extrato_bancario').select(CAMPOS_EXTRATO).eq('company_id', companyId).not('categoria_id', 'is', null).order('data_transacao').order('id')),
    buscarTudo(() => supabase.from('movimentacao_baixas').select('id, extrato_bancario_id').eq('company_id', companyId).not('extrato_bancario_id', 'is', null).order('id')),
    buscarTudo(() => supabase.from('clientes').select('id, nome').eq('company_id', companyId).order('id')),
    buscarTudo(() => supabase.from('fornecedores').select('id, nome').eq('company_id', companyId).order('id')),
    buscarTudo(() => supabase.from('categorias').select('id, grupo_dre').eq('company_id', companyId).order('id'))
  ]);
  const jaLigados = new Set(ligadas.map((b) => b.extrato_bancario_id));
  return {
    pendentes: extrato.filter((l) => !jaLigados.has(l.id)),
    totalClassificados: extrato.length,
    clientes,
    fornecedores,
    categoriasPorId: new Map(categorias.map((c) => [c.id, c]))
  };
};

export const gerarMovimentacoes = async ({ companyId, titulos, userId }) => {
  const numero = (t) => `EXT-${t.linha.numero_documento}`;
  const existentes = new Map();
  for (const lote of lotes(titulos.map(numero), 150)) {
    const { data, error } = await supabase.from('movimentacao_financeira').select('id, numero_titulo').eq('company_id', companyId).in('numero_titulo', lote);
    if (error) throw error;
    (data || []).forEach((r) => existentes.set(r.numero_titulo, r.id));
  }

  // 1) títulos (já pagos) — os que existirem de uma tentativa anterior são reaproveitados
  const novos = titulos.filter((t) => !existentes.has(numero(t)));
  for (const lote of lotes(novos)) {
    const payload = lote.map((t) => ({
      company_id: companyId,
      tipo: t.tipo,
      numero_titulo: numero(t),
      cliente_id: t.cliente?.id || null,
      fornecedor_id: t.fornecedor?.id || null,
      valor_total: t.valor,
      data_emissao: t.linha.data_transacao,
      data_vencimento: t.linha.data_transacao,
      categoria_id: t.linha.categoria_id,
      subcategoria_id: t.linha.subcategoria_id,
      centro_custo_id: t.linha.centro_custo_id,
      banco_id: t.linha.banco_id,
      status: 'pago',
      parcela_atual: 1,
      total_parcelas: 1,
      observacoes: `${t.linha.descricao}${t.linha.nota_fiscal ? ` | NF ${t.linha.nota_fiscal}` : ''}`,
      created_by: userId || null
    }));
    const { data, error } = await supabase.from('movimentacao_financeira').insert(payload).select('id, numero_titulo');
    if (error) throw error;
    (data || []).forEach((r) => existentes.set(r.numero_titulo, r.id));
  }

  // 2) baixas na data do extrato, já conciliadas com a linha do extrato
  const hoje = new Date().toISOString().split('T')[0];
  for (const lote of lotes(titulos)) {
    const payload = lote.map((t) => ({
      movimentacao_id: existentes.get(numero(t)),
      company_id: companyId,
      valor_baixa: t.valor,
      valor_juros: 0,
      valor_desconto: 0,
      data_baixa: t.linha.data_transacao,
      banco_id: t.linha.banco_id,
      categoria_id: t.linha.categoria_id,
      subcategoria_id: t.linha.subcategoria_id,
      centro_custo_id: t.linha.centro_custo_id,
      observacoes: 'Gerada a partir do extrato bancário',
      status_conciliacao: 'Conciliado',
      data_conciliacao: hoje,
      extrato_bancario_id: t.linha.id,
      created_by: userId || null
    }));
    const { error } = await supabase.from('movimentacao_baixas').insert(payload);
    if (error) throw error;
  }

  // 3) marca as linhas do extrato como conciliadas
  for (const tipo of ['pagar', 'receber']) {
    const ids = titulos.filter((t) => t.tipo === tipo).map((t) => t.linha.id);
    for (const lote of lotes(ids)) {
      const { error } = await supabase.from('extrato_bancario').update({ status_conciliacao: 'Conciliado', tipo_conta_sistema: tipo.toUpperCase() }).in('id', lote);
      if (error) throw error;
    }
  }
  return { titulos: titulos.length, aPagar: titulos.filter((t) => t.tipo === 'pagar').length, aReceber: titulos.filter((t) => t.tipo === 'receber').length };
};

// ---- Tela "Classificar extrato" ----

export const listarExtrato = async ({ companyId, bancoId, de, ate }) =>
  buscarTudo(() => {
    let q = supabase
      .from('extrato_bancario')
      .select('id, data_transacao, descricao, valor, tipo_transacao, tipo_norm, assinatura, categoria_id, subcategoria_id, centro_custo_id, cliente_nome, classificacao_origem, nota_fiscal, estornada, status_conciliacao')
      .eq('company_id', companyId)
      .order('data_transacao', { ascending: true })
      .order('id', { ascending: true });
    if (bancoId && bancoId !== 'TODOS') q = q.eq('banco_id', bancoId);
    if (de) q = q.gte('data_transacao', de);
    if (ate) q = q.lte('data_transacao', ate);
    return q;
  });

// escopo: 'linhas' (só as selecionadas) | 'favorecido' (mesmo tipo + mesma descrição) | 'tipo' (todo o tipo de transação)
export const classificarLinhas = async ({ companyId, linhas, classificacao, escopo, aplicarSemelhantes, userId }) => {
  const campos = {
    categoria_id: classificacao.categoria_id || null,
    subcategoria_id: classificacao.subcategoria_id || null,
    centro_custo_id: classificacao.centro_custo_id || null,
    cliente_nome: classificacao.cliente_nome?.trim() || null
  };

  for (const lote of lotes(linhas.map((l) => l.id))) {
    const { error } = await supabase.from('extrato_bancario').update({ ...campos, classificacao_origem: 'manual', regra_id: null }).in('id', lote);
    if (error) throw error;
  }

  let semelhantes = 0;
  if (escopo !== 'linhas') {
    const base = linhas[0];
    const tipo = base.tipo_norm || tipoNorm(base.tipo_transacao);
    const assinatura = escopo === 'favorecido' ? (base.assinatura || assinaturaDe(base.descricao)) : null;

    let qr = supabase.from('extrato_regras').select('id').eq('company_id', companyId).eq('tipo_norm', tipo);
    qr = assinatura ? qr.eq('assinatura', assinatura) : qr.is('assinatura', null);
    const { data: ex, error: e1 } = await qr.maybeSingle();
    if (e1) throw e1;
    const regra = { ...campos, cliente_nome: assinatura ? campos.cliente_nome : null };
    let regraId = ex?.id;
    if (regraId) {
      const { error } = await supabase.from('extrato_regras').update(regra).eq('id', regraId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('extrato_regras').insert({ ...regra, company_id: companyId, tipo_norm: tipo, assinatura, created_by: userId || null }).select('id').single();
      if (error) throw error;
      regraId = data.id;
    }

    if (aplicarSemelhantes) {
      // só preenche o que ainda está sem categoria; nunca sobrescreve classificação existente
      let qu = supabase.from('extrato_bancario').update({ ...regra, classificacao_origem: 'regra', regra_id: regraId })
        .eq('company_id', companyId).eq('tipo_norm', tipo).is('categoria_id', null);
      qu = assinatura ? qu.eq('assinatura', assinatura) : qu;
      const { data, error } = await qu.select('id');
      if (error) throw error;
      semelhantes = data?.length || 0;
    }
  }
  return { semelhantes };
};
