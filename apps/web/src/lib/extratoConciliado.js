// Extrato conciliado: cada linha do extrato do banco com o que o sistema sabe dela
// (fornecedor/cliente, título, nota fiscal, categoria, centro de custo, obra, observação).
// Serve para enviar à contabilidade já classificado.
import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;
const em = (lista, n = 150) => { const r = []; for (let i = 0; i < lista.length; i += n) r.push(lista.slice(i, i + n)); return r; };
export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

// Alguns documentos foram numerados pelo sistema (PIX_DEB-20261103-5) para não repetir; mostra só o que o banco informou.
export const documentoDoBanco = (doc) => (doc ? String(doc).replace(/^([A-Za-z_]+)-\d{8}-\d+[a-z]?$/, '$1').replace(/^(PIX)-\d{8}-\d+$/, '$1') : '');

export const SITUACOES = [
  { id: 'TODAS', rotulo: 'Todas' },
  { id: 'CONCILIADAS', rotulo: 'Só conciliadas' },
  { id: 'PENDENTES', rotulo: 'Só não conciliadas' },
  { id: 'SEM_CLASSIFICACAO', rotulo: 'Sem categoria' }
];

export const carregarExtratoConciliado = async (companyId, { bancoId, de, ate } = {}) => {
  const [bancos, categorias, subs, centros, projetos] = await Promise.all([
    supabase.from('bancos').select('id, nome, agencia, conta, saldo, data_saldo_inicial, limite').eq('company_id', companyId).order('nome').then(ok),
    supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', companyId).limit(1000).then(ok),
    supabase.from('subcategorias').select('id, nome').eq('company_id', companyId).limit(2000).then(ok),
    supabase.from('centros_custo').select('id, codigo, nome').eq('company_id', companyId).limit(500).then(ok),
    supabase.from('projetos').select('id, codigo, nome').eq('company_id', companyId).limit(500).then(ok)
  ]);
  const mapa = (l) => new Map(l.map((x) => [x.id, x]));
  const cat = mapa(categorias); const sub = mapa(subs); const cc = mapa(centros); const prj = mapa(projetos); const bco = mapa(bancos);
  const banco = bancoId && bancoId !== 'TODOS' ? bco.get(bancoId) : null;

  // Lê desde o saldo inicial de cada banco para poder mostrar o saldo bancário de cada linha.
  const iniciais = bancos.filter((b) => b.data_saldo_inicial && (!banco || b.id === banco.id)).map((b) => b.data_saldo_inicial);
  const inicioLeitura = de ? [de, ...iniciais].sort()[0] : null;
  const extrato = await buscarTudo(() => {
    let q = supabase.from('extrato_bancario')
      .select('id, banco_id, data_transacao, descricao, valor, numero_documento, nota_fiscal, status_conciliacao, categoria_id, subcategoria_id, centro_custo_id, projeto_id, cliente_nome, estornada')
      .eq('company_id', companyId).order('data_transacao').order('created_at').order('id');
    if (banco) q = q.eq('banco_id', banco.id);
    if (inicioLeitura) q = q.gte('data_transacao', inicioLeitura);
    if (ate) q = q.lte('data_transacao', ate);
    return q;
  });

  // baixa e título que originaram cada linha
  const porExtrato = new Map();
  for (const lote of em(extrato.map((e) => e.id))) {
    ok(await supabase.from('movimentacao_baixas').select('id, extrato_bancario_id, movimentacao_id, observacoes').in('extrato_bancario_id', lote))
      .forEach((b) => { const l = porExtrato.get(b.extrato_bancario_id) || []; l.push(b); porExtrato.set(b.extrato_bancario_id, l); });
  }
  const movIds = [...new Set([...porExtrato.values()].flat().map((b) => b.movimentacao_id))];
  const movs = new Map();
  const comprovantes = new Map();
  for (const lote of em(movIds)) {
    ok(await supabase.from('movimentacao_documentos').select('movimentacao_id, nome_arquivo').eq('tipo_documento', 'comprovante').in('movimentacao_id', lote))
      .forEach((d) => { const l = comprovantes.get(d.movimentacao_id) || []; l.push(d.nome_arquivo); comprovantes.set(d.movimentacao_id, l); });
    ok(await supabase.from('movimentacao_financeira')
      .select('id, tipo, numero_titulo, observacoes, data_vencimento, parcela_atual, total_parcelas, fornecedor:fornecedores(nome, cnpj), cliente:clientes(nome, cnpj_cpf)')
      .in('id', lote)).forEach((m) => movs.set(m.id, m));
  }

  const saldoDoBanco = new Map(bancos.filter((b) => b.data_saldo_inicial).map((b) => [b.id, arred(b.saldo)]));
  const linhas = [];
  for (const e of extrato) {
    const valor = arred(e.valor);
    const bk = bco.get(e.banco_id);
    const dentroDoSaldo = !!bk?.data_saldo_inicial && e.data_transacao >= bk.data_saldo_inicial;
    if (dentroDoSaldo && !e.estornada) saldoDoBanco.set(bk.id, arred((saldoDoBanco.get(bk.id) || 0) + valor));
    if (de && e.data_transacao < de) continue; // lido só para acumular o saldo
    const baixas = porExtrato.get(e.id) || [];
    const ts = baixas.map((b) => movs.get(b.movimentacao_id)).filter(Boolean);
    const c = cat.get(e.categoria_id);
    const obs = [...new Set([...ts.map((t) => t.observacoes), ...baixas.map((b) => b.observacoes)].filter(Boolean))].join(' | ');
    const contra = ts.map((t) => t.fornecedor?.nome || t.cliente?.nome).filter(Boolean);
    const doc = ts.map((t) => t.fornecedor?.cnpj || t.cliente?.cnpj_cpf).filter(Boolean);
    linhas.push({
      id: e.id,
      bancoId: e.banco_id,
      data: e.data_transacao,
      banco: bco.get(e.banco_id)?.nome || '',
      documento: documentoDoBanco(e.numero_documento),
      historico: e.descricao || '',
      contraparte: [...new Set(contra)].join(' + ') || e.cliente_nome || '',
      cpfCnpj: [...new Set(doc)].join(' + '),
      titulo: ts.map((t) => t.numero_titulo).filter(Boolean).join(' + '),
      parcela: ts.length === 1 && ts[0].total_parcelas > 1 ? `${ts[0].parcela_atual}/${ts[0].total_parcelas}` : '',
      notaFiscal: e.nota_fiscal || '',
      codigoCategoria: c?.codigo || '',
      categoria: c?.nome || '',
      subcategoria: sub.get(e.subcategoria_id)?.nome || '',
      centroCusto: cc.get(e.centro_custo_id)?.nome || '',
      obra: prj.get(e.projeto_id) ? `${prj.get(e.projeto_id).codigo ? `${prj.get(e.projeto_id).codigo} - ` : ''}${prj.get(e.projeto_id).nome}` : '',
      observacao: obs,
      comprovante: ts.flatMap((t) => comprovantes.get(t.id) || []).join(' | '),
      entrada: valor > 0 ? valor : 0,
      saida: valor < 0 ? -valor : 0,
      valor,
      saldo: dentroDoSaldo ? saldoDoBanco.get(bk.id) : null,
      conciliado: e.status_conciliacao === 'Conciliado',
      classificado: !!e.categoria_id,
      estornada: !!e.estornada
    });
  }
  // saldo bancário inicial e final de cada conta no período (sobre todas as linhas, antes do filtro "Mostrar")
  const saldos = bancos.filter((b) => b.data_saldo_inicial && (!banco || b.id === banco.id)).map((b) => {
    const ls = linhas.filter((l) => l.bancoId === b.id && l.saldo !== null);
    const base = { bancoId: b.id, nome: b.nome, agencia: b.agencia, conta: b.conta };
    if (!ls.length) return (!de && !ate) ? { ...base, inicial: arred(b.saldo), final: arred(b.saldo), dataInicial: b.data_saldo_inicial, dataFinal: b.data_saldo_inicial } : { ...base, inicial: null, final: null };
    const p0 = ls[0]; const u0 = ls[ls.length - 1];
    return { ...base, inicial: arred(p0.saldo - p0.valor), final: u0.saldo, dataInicial: de || b.data_saldo_inicial, dataFinal: u0.data };
  });
  return { banco, bancos, linhas, saldos };
};

export const filtrarPorSituacao = (linhas, situacao) => {
  if (situacao === 'CONCILIADAS') return linhas.filter((l) => l.conciliado);
  if (situacao === 'PENDENTES') return linhas.filter((l) => !l.conciliado);
  if (situacao === 'SEM_CLASSIFICACAO') return linhas.filter((l) => !l.classificado);
  return linhas;
};

export const resumir = (linhas, saldos = []) => {
  const entradas = arred(linhas.reduce((s, l) => s + l.entrada, 0));
  const saidas = arred(linhas.reduce((s, l) => s + l.saida, 0));
  const porCategoria = new Map();
  linhas.forEach((l) => {
    const k = l.classificado ? `${l.codigoCategoria} ${l.categoria}`.trim() : 'SEM CATEGORIA';
    const r = porCategoria.get(k) || { categoria: k, entradas: 0, saidas: 0, qtd: 0 };
    r.entradas = arred(r.entradas + l.entrada); r.saidas = arred(r.saidas + l.saida); r.qtd += 1;
    porCategoria.set(k, r);
  });
  const unico = saldos.length === 1 ? saldos[0] : null;
  return {
    entradas, saidas, resultado: arred(entradas - saidas), qtd: linhas.length,
    semCategoria: linhas.filter((l) => !l.classificado).length,
    naoConciliadas: linhas.filter((l) => !l.conciliado).length,
    saldos,
    saldoInicial: unico ? unico.inicial : null,
    saldoFinal: unico ? unico.final : null,
    dataSaldoInicial: unico?.dataInicial || null,
    dataSaldoFinal: unico?.dataFinal || null,
    porCategoria: [...porCategoria.values()].sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
  };
};

// "Sicredi ag 0731 cc 68774-1: inicial R$ x (29/10) · final R$ y (03/11)"
export const textoSaldos = (resumo) => (resumo.saldos || []).filter((s) => s.inicial !== null).map((s) => `${s.nome}${s.conta ? ` cc ${s.conta}` : ''}: saldo inicial ${moeda(s.inicial)} (${fmtData(s.dataInicial)}) · saldo final ${moeda(s.final)} (${fmtData(s.dataFinal)})`);
