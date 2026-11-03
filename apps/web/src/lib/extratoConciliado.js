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

  // Com um banco escolhido, lê desde o saldo inicial para poder mostrar o saldo de cada linha.
  const inicioLeitura = banco?.data_saldo_inicial && (!de || de > banco.data_saldo_inicial) ? banco.data_saldo_inicial : de;
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
  for (const lote of em(movIds)) {
    ok(await supabase.from('movimentacao_financeira')
      .select('id, tipo, numero_titulo, observacoes, data_vencimento, parcela_atual, total_parcelas, fornecedor:fornecedores(nome, cnpj), cliente:clientes(nome, cnpj_cpf)')
      .in('id', lote)).forEach((m) => movs.set(m.id, m));
  }

  let saldo = banco && banco.data_saldo_inicial ? arred(banco.saldo) : null;
  const linhas = [];
  for (const e of extrato) {
    const valor = arred(e.valor);
    const dentroDoSaldo = banco?.data_saldo_inicial ? e.data_transacao >= banco.data_saldo_inicial : false;
    if (saldo !== null && dentroDoSaldo && !e.estornada) saldo = arred(saldo + valor);
    if (de && e.data_transacao < de) continue; // lido só para acumular o saldo
    const baixas = porExtrato.get(e.id) || [];
    const ts = baixas.map((b) => movs.get(b.movimentacao_id)).filter(Boolean);
    const c = cat.get(e.categoria_id);
    const obs = [...new Set([...ts.map((t) => t.observacoes), ...baixas.map((b) => b.observacoes)].filter(Boolean))].join(' | ');
    const contra = ts.map((t) => t.fornecedor?.nome || t.cliente?.nome).filter(Boolean);
    const doc = ts.map((t) => t.fornecedor?.cnpj || t.cliente?.cnpj_cpf).filter(Boolean);
    linhas.push({
      id: e.id,
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
      entrada: valor > 0 ? valor : 0,
      saida: valor < 0 ? -valor : 0,
      valor,
      saldo: saldo !== null && dentroDoSaldo ? saldo : null,
      conciliado: e.status_conciliacao === 'Conciliado',
      classificado: !!e.categoria_id,
      estornada: !!e.estornada
    });
  }
  return { banco, bancos, linhas };
};

export const filtrarPorSituacao = (linhas, situacao) => {
  if (situacao === 'CONCILIADAS') return linhas.filter((l) => l.conciliado);
  if (situacao === 'PENDENTES') return linhas.filter((l) => !l.conciliado);
  if (situacao === 'SEM_CLASSIFICACAO') return linhas.filter((l) => !l.classificado);
  return linhas;
};

export const resumir = (linhas, banco, de) => {
  const entradas = arred(linhas.reduce((s, l) => s + l.entrada, 0));
  const saidas = arred(linhas.reduce((s, l) => s + l.saida, 0));
  const primeira = linhas.find((l) => l.saldo !== null);
  const ultima = [...linhas].reverse().find((l) => l.saldo !== null);
  const porCategoria = new Map();
  linhas.forEach((l) => {
    const k = l.classificado ? `${l.codigoCategoria} ${l.categoria}`.trim() : 'SEM CATEGORIA';
    const r = porCategoria.get(k) || { categoria: k, entradas: 0, saidas: 0, qtd: 0 };
    r.entradas = arred(r.entradas + l.entrada); r.saidas = arred(r.saidas + l.saida); r.qtd += 1;
    porCategoria.set(k, r);
  });
  return {
    entradas, saidas, resultado: arred(entradas - saidas), qtd: linhas.length,
    semCategoria: linhas.filter((l) => !l.classificado).length,
    naoConciliadas: linhas.filter((l) => !l.conciliado).length,
    saldoInicial: primeira ? arred(primeira.saldo - primeira.valor) : (banco?.data_saldo_inicial && !de ? arred(banco.saldo) : null),
    saldoFinal: ultima ? ultima.saldo : null,
    porCategoria: [...porCategoria.values()].sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
  };
};
