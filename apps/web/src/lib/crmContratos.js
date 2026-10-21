// Contratos recorrentes (BPO mensal): regras de competência, proporcional e faturamento mensal em pedidos de venda.
import { supabase } from '@/lib/customSupabaseClient';
import { totalItem, hojeISO } from '@/lib/crmService';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// ---------- datas (sempre AAAA-MM-DD, sem fuso) ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const partes = (s) => String(s).slice(0, 10).split('-').map(Number);
export const diasDoMes = (competencia) => { const [a, m] = partes(competencia); return new Date(a, m, 0).getDate(); };
export const primeiroDia = (dataISO) => { const [a, m] = partes(dataISO); return iso(a, m, 1); };
export const somaMeses = (competencia, n) => { const [a, m] = partes(competencia); const t = a * 12 + (m - 1) + n; return iso(Math.floor(t / 12), (t % 12) + 1, 1); };
export const rotuloCompetencia = (competencia) => { const [a, m] = partes(competencia); return `${pad(m)}/${a}`; };
const diasEntre = (de, ate) => Math.round((Date.UTC(...partes(ate).map((x, i) => (i === 1 ? x - 1 : x))) - Date.UTC(...partes(de).map((x, i) => (i === 1 ? x - 1 : x)))) / 86400000);
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Valor cheio de um mês: soma dos itens do contrato (quantidade × preço − desconto).
export const valorMensal = (itens) => arred(itens.reduce((s, i) => s + totalItem(i), 0));

// Parte do mês coberta pelo contrato. Proporcional pelos dias corridos (início e fim contam).
export const fatorDaCompetencia = (contrato, competencia) => {
  const total = diasDoMes(competencia);
  const [a, m] = partes(competencia);
  const mesIni = iso(a, m, 1);
  const mesFim = iso(a, m, total);
  const ini = contrato.data_inicio > mesIni ? contrato.data_inicio : mesIni;
  const fim = contrato.data_fim && contrato.data_fim < mesFim ? contrato.data_fim : mesFim;
  if (ini > fim) return { dias: 0, diasMes: total, fator: 0, proporcional: false };
  const dias = diasEntre(ini, fim) + 1;
  if (!contrato.proporcional || dias === total) return { dias, diasMes: total, fator: 1, proporcional: false };
  return { dias, diasMes: total, fator: dias / total, proporcional: true };
};

// Competência C é cobrada no mês seguinte (dia de faturamento); o vencimento fica no mesmo mês ou no seguinte, se o dia for anterior.
export const dataFaturamento = (contrato, competencia) => {
  const [a, m] = partes(somaMeses(competencia, 1));
  return iso(a, m, contrato.dia_faturamento);
};
export const dataVencimento = (contrato, competencia) => {
  const base = contrato.dia_vencimento >= contrato.dia_faturamento ? 1 : 2;
  const [a, m] = partes(somaMeses(competencia, base));
  return iso(a, m, contrato.dia_vencimento);
};

// Competências já encerradas (mês anterior ao de hoje, ou antes) que ainda não geraram pedido.
export const competenciasDevidas = (contrato, itens, faturadas, hoje = hojeISO()) => {
  if (contrato.status !== 'ativo' || !itens.length) return [];
  const ultima = somaMeses(primeiroDia(hoje), -1);
  const limite = contrato.data_fim && primeiroDia(contrato.data_fim) < ultima ? primeiroDia(contrato.data_fim) : ultima;
  const cheio = valorMensal(itens);
  const lista = [];
  for (let c = primeiroDia(contrato.data_inicio); c <= limite; c = somaMeses(c, 1)) {
    if (faturadas.has(c)) continue;
    const f = fatorDaCompetencia(contrato, c);
    if (f.dias === 0) continue;
    lista.push({
      competencia: c, rotulo: rotuloCompetencia(c), valor: arred(cheio * f.fator), proporcional: f.proporcional, dias: f.dias, diasMes: f.diasMes,
      faturamento: dataFaturamento(contrato, c), vencimento: dataVencimento(contrato, c), noPrazo: dataFaturamento(contrato, c) <= hoje
    });
  }
  return lista;
};

// Próxima competência a vencer (ainda aberta), para mostrar na lista de contratos.
export const proximaCompetencia = (contrato, faturadas, hoje = hojeISO()) => {
  if (contrato.status === 'encerrado') return null;
  let c = primeiroDia(contrato.data_inicio);
  const limite = somaMeses(primeiroDia(hoje), 1);
  for (; c <= limite; c = somaMeses(c, 1)) {
    if (contrato.data_fim && c > primeiroDia(contrato.data_fim)) return null;
    if (!faturadas.has(c)) return c;
  }
  return null;
};

export const aplicarReajuste = (itens, percentual) => itens.map((i) => ({ ...i, preco_unitario: arred((Number(i.preco_unitario) || 0) * (1 + (Number(percentual) || 0) / 100)), desconto: arred((Number(i.desconto) || 0) * (1 + (Number(percentual) || 0) / 100)) }));

// ---------- acesso a dados ----------
export const listarContratos = async (companyId) => {
  const contratos = ok(await supabase.from('contratos_recorrentes').select('*, cliente:clientes(id, nome)').eq('company_id', companyId).order('created_at', { ascending: false }));
  const itens = ok(await supabase.from('contratos_recorrentes_itens').select('*').eq('company_id', companyId).order('ordem'));
  const fat = ok(await supabase.from('contratos_faturamentos').select('contrato_id, competencia, valor, pedido_venda_id, created_at').eq('company_id', companyId));
  return contratos.map((c) => ({ ...c, itens: itens.filter((i) => i.contrato_id === c.id), faturamentos: fat.filter((f) => f.contrato_id === c.id) }));
};

export const carregarContrato = async (id) => {
  const c = ok(await supabase.from('contratos_recorrentes').select('*, cliente:clientes(id, nome)').eq('id', id).single());
  const itens = ok(await supabase.from('contratos_recorrentes_itens').select('*').eq('contrato_id', id).order('ordem'));
  const fat = ok(await supabase.from('contratos_faturamentos').select('*').eq('contrato_id', id).order('competencia', { ascending: false }));
  const reaj = ok(await supabase.from('contratos_reajustes').select('*').eq('contrato_id', id).order('data', { ascending: false }));
  return { ...c, itens, faturamentos: fat, reajustes: reaj };
};

export const contratoDaProposta = async (propostaId) => ok(await supabase.from('contratos_recorrentes').select('id, numero').eq('proposta_id', propostaId).maybeSingle());

export const gerarNumeroContrato = async (companyId, base) => {
  const prefixo = base || `CT${hojeISO().replace(/-/g, '').slice(2)}`;
  const existentes = ok(await supabase.from('contratos_recorrentes').select('numero').eq('company_id', companyId).like('numero', `${prefixo}%`));
  const usados = new Set(existentes.map((e) => e.numero));
  if (!usados.has(prefixo)) return prefixo;
  let n = 2;
  while (usados.has(`${prefixo}-${n}`)) n += 1;
  return `${prefixo}-${n}`;
};

const linhasItens = (companyId, contratoId, itens) => itens.map((i, idx) => ({
  company_id: companyId, contrato_id: contratoId, servico_id: i.servico_id, ordem: idx + 1, descricao: i.descricao,
  quantidade: Number(i.quantidade) || 1, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0
}));

export const criarContrato = async (companyId, dados, itens) => {
  const c = ok(await supabase.from('contratos_recorrentes').insert({ company_id: companyId, ...dados }).select().single());
  try {
    if (itens.length) ok(await supabase.from('contratos_recorrentes_itens').insert(linhasItens(companyId, c.id, itens)));
  } catch (e) {
    await supabase.from('contratos_recorrentes').delete().eq('id', c.id);
    throw e;
  }
  return c;
};

export const atualizarContrato = async (companyId, id, dados, itens) => {
  const c = ok(await supabase.from('contratos_recorrentes').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single());
  if (itens) {
    ok(await supabase.from('contratos_recorrentes_itens').delete().eq('contrato_id', id));
    if (itens.length) ok(await supabase.from('contratos_recorrentes_itens').insert(linhasItens(companyId, id, itens)));
  }
  return c;
};

export const excluirContrato = async (id) => ok(await supabase.from('contratos_recorrentes').delete().eq('id', id));

// Competência marcada como faturada cujo pedido foi excluído: libera para gerar o pedido de novo.
export const liberarCompetencia = async (faturamentoId) => ok(await supabase.from('contratos_faturamentos').delete().eq('id', faturamentoId).is('pedido_venda_id', null));

// Registra o reajuste (histórico) e atualiza os preços dos itens do contrato.
export const registrarReajuste = async (companyId, contrato, percentual, indice) => {
  const antes = valorMensal(contrato.itens);
  const novos = aplicarReajuste(contrato.itens, percentual);
  const depois = valorMensal(novos);
  await atualizarContrato(companyId, contrato.id, { ultimo_reajuste: hojeISO(), reajuste_indice: indice || contrato.reajuste_indice || null }, novos);
  ok(await supabase.from('contratos_reajustes').insert({ company_id: companyId, contrato_id: contrato.id, percentual: Number(percentual), valor_antes: antes, valor_depois: depois, indice: indice || null }));
  return { antes, depois };
};
