// Acesso aos dados de clientes, projetos, tarefas e diagnóstico da Engagement (BPO E5 e Consultoria F5).
import { supabase } from '@/lib/customSupabaseClient';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const STATUS_CONTRATO = {
  proposta: 'Proposta',
  em_implantacao: 'Em implantação',
  em_operacao: 'Em operação',
  pausado: 'Pausado',
  encerrado: 'Encerrado'
};

export const STATUS_TAREFA = {
  pendente: 'Pendente',
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  na: 'N/A'
};

export const FUNCOES = {
  documental: 'Op. Documental',
  financeiro: 'Op. Financeiro',
  analista: 'Analista',
  consultor: 'Consultor'
};

export const listarClientes = async () => {
  const clientes = ok(await supabase.from('clientes_bpo').select('*').order('nome'));
  const tarefas = ok(await supabase.from('eng_tarefas').select('cliente_id, origem, status').eq('origem', 'b1'));
  const resumo = {};
  tarefas.forEach((t) => {
    const r = (resumo[t.cliente_id] ||= { total: 0, feitas: 0 });
    if (t.status !== 'na') { r.total += 1; if (t.status === 'concluido') r.feitas += 1; }
  });
  return clientes.map((c) => ({ ...c, b1: resumo[c.id] || { total: 0, feitas: 0 } }));
};

export const criarCliente = async (dados) => ok(
  await supabase.from('clientes_bpo').insert({ status: 'ativo', ...dados }).select().single()
);

export const carregarCliente = async (id) => ok(await supabase.from('clientes_bpo').select('*').eq('id', id).single());

export const atualizarCliente = async (id, dados) => ok(
  await supabase.from('clientes_bpo').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const iniciarOnboarding = async (clienteId, inicio) => ok(
  await supabase.rpc('bpo_iniciar_onboarding', { p_cliente: clienteId, p_inicio: inicio })
);

export const carregarDiagnostico = async (clienteId) => {
  const rows = ok(await supabase.from('bpo_diagnosticos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1));
  return rows[0] || null;
};

export const salvarDiagnostico = async (clienteId, id, campos) => {
  if (id) return ok(await supabase.from('bpo_diagnosticos').update(campos).eq('id', id).select().single());
  return ok(await supabase.from('bpo_diagnosticos').insert({ cliente_id: clienteId, ...campos }).select().single());
};

export const listarTarefas = async (clienteId, filtros = {}) => {
  let q = supabase.from('eng_tarefas').select('*').eq('cliente_id', clienteId).order('dia_plano', { nullsFirst: false }).order('data_prevista').order('created_at');
  if (filtros.origem) q = q.eq('origem', filtros.origem);
  return ok(await q);
};

export const atualizarTarefa = async (id, campos) => ok(
  await supabase.from('eng_tarefas').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const listarImplantacao = async (clienteId) => ok(
  await supabase.from('bpo_implantacao_itens').select('*').eq('cliente_id', clienteId).order('secao').order('ordem')
);

export const atualizarItemImplantacao = async (id, campos) => ok(
  await supabase.from('bpo_implantacao_itens').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const listarPessoas = async () => ok(await supabase.from('eng_pessoas').select('*').eq('ativo', true).order('nome'));

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const formatarData = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
