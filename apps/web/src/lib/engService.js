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
  const tarefas = ok(await supabase.from('eng_tarefas').select('cliente_id, origem, status').in('origem', ['b1', 'f5']));
  const resumo = {};
  tarefas.forEach((t) => {
    const r = ((resumo[t.cliente_id] ||= {})[t.origem] ||= { total: 0, feitas: 0 });
    if (t.status !== 'na') { r.total += 1; if (t.status === 'concluido') r.feitas += 1; }
  });
  const vazio = { total: 0, feitas: 0 };
  return clientes.map((c) => ({ ...c, b1: resumo[c.id]?.b1 || vazio, f5: resumo[c.id]?.f5 || vazio }));
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

// ---------- Consultoria F5: projeto, cronograma, agenda, OS de visita e entregas ----------
export const STATUS_VISITA = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  parcial: 'Realizada parcialmente',
  remarcada: 'Remarcada',
  cancelada: 'Cancelada'
};

export const TIPOS_COMPROMISSO = ['Visita', 'Reunião com o cliente', 'Reunião com o contador', 'Interno — Engagement', 'Outro'];

export const STATUS_ENTREGA = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', na: 'N/A' };

export const listarProjetosF5 = async (clienteId) => ok(
  await supabase.from('eng_projetos').select('*').eq('cliente_id', clienteId).eq('tipo', 'f5').order('created_at')
);

export const criarProjetoF5 = async (clienteId, dados) => ok(
  await supabase.from('eng_projetos').insert({ cliente_id: clienteId, tipo: 'f5', status: 'em_andamento', ...dados }).select().single()
);

export const atualizarProjeto = async (id, dados) => ok(
  await supabase.from('eng_projetos').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const listarTarefasProjeto = async (projetoId) => ok(
  await supabase.from('eng_tarefas').select('*').eq('projeto_id', projetoId).order('dia_plano', { nullsFirst: false }).order('data_prevista').order('created_at')
);

export const criarTarefa = async (clienteId, projetoId, dados) => ok(
  await supabase.from('eng_tarefas').insert({ cliente_id: clienteId, projeto_id: projetoId, origem: 'f5', funcao_responsavel: 'consultor', ...dados }).select().single()
);

export const excluirTarefa = async (id) => ok(await supabase.from('eng_tarefas').delete().eq('id', id));

export const listarAgenda = async (clienteId, projetoId) => {
  let q = supabase.from('eng_agenda').select('*').eq('cliente_id', clienteId).order('data').order('hora_inicio', { nullsFirst: true });
  if (projetoId) q = q.eq('projeto_id', projetoId);
  return ok(await q);
};

export const criarAgenda = async (clienteId, projetoId, dados) => ok(
  await supabase.from('eng_agenda').insert({ cliente_id: clienteId, projeto_id: projetoId, ...dados }).select().single()
);

export const atualizarAgenda = async (id, dados) => ok(
  await supabase.from('eng_agenda').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const excluirAgenda = async (id) => ok(await supabase.from('eng_agenda').delete().eq('id', id));

export const listarOS = async (clienteId) => ok(
  await supabase.from('eng_os').select('*').eq('cliente_id', clienteId).order('numero', { ascending: false })
);

export const criarOS = async (clienteId, projetoId, dados) => {
  const ultimas = ok(await supabase.from('eng_os').select('numero').eq('cliente_id', clienteId).order('numero', { ascending: false }).limit(1));
  const numero = (ultimas[0]?.numero || 0) + 1;
  return ok(await supabase.from('eng_os').insert({ cliente_id: clienteId, projeto_id: projetoId, numero, ...dados }).select().single());
};

export const atualizarOS = async (id, dados) => ok(
  await supabase.from('eng_os').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const listarEntregaveis = async (projetoId) => ok(
  await supabase.from('eng_entregaveis').select('*').eq('projeto_id', projetoId).order('ordem').order('created_at')
);

export const criarEntregavel = async (clienteId, projetoId, dados) => ok(
  await supabase.from('eng_entregaveis').insert({ cliente_id: clienteId, projeto_id: projetoId, ...dados }).select().single()
);

export const atualizarEntregavel = async (id, dados) => ok(
  await supabase.from('eng_entregaveis').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select().single()
);

export const excluirEntregavel = async (id) => ok(await supabase.from('eng_entregaveis').delete().eq('id', id));

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const diaDaSemana = (iso) => (iso ? DIAS[new Date(`${String(iso).slice(0, 10)}T12:00:00`).getDay()] : '');

// Datas dos encontros: a partir do início, nos dias da semana escolhidos, pulando os períodos de pausa.
export const calcularDatas = ({ inicio, diasSemana, quantidade, pausas = [] }) => {
  const datas = [];
  const d = new Date(`${inicio}T12:00:00`);
  const emPausa = (iso) => pausas.some((p) => p.de && p.ate && iso >= p.de && iso <= p.ate);
  let guarda = 0;
  while (datas.length < quantidade && guarda < 2000) {
    const iso = d.toISOString().slice(0, 10);
    if (diasSemana.includes(d.getDay()) && !emPausa(iso)) datas.push(iso);
    d.setDate(d.getDate() + 1);
    guarda += 1;
  }
  return datas;
};

// Distribui as datas pelas atividades do cronograma (uma data por "dia do plano") e cria a agenda correspondente.
export const gerarAgendaDoCronograma = async (clienteId, projetoId, tarefas, { inicio, diasSemana, horaInicio, pausas }) => {
  const dias = [...new Set(tarefas.map((t) => t.dia_plano).filter((n) => n !== null && n !== undefined))].sort((a, b) => a - b);
  const datas = calcularDatas({ inicio, diasSemana, quantidade: dias.length, pausas });
  const dataDoDia = new Map(dias.map((n, i) => [n, datas[i]]));
  for (const t of tarefas) {
    const data = dataDoDia.get(t.dia_plano);
    if (data) await atualizarTarefa(t.id, { data_prevista: data });
  }
  const jaNaAgenda = new Set((await listarAgenda(clienteId, projetoId)).map((a) => a.dia_plano).filter(Boolean));
  let criados = 0;
  for (const n of dias) {
    if (jaNaAgenda.has(n) || !dataDoDia.get(n)) continue;
    const doDia = tarefas.filter((t) => t.dia_plano === n);
    const horas = doDia.reduce((s, t) => s + (Number(t.carga_horas) || 0), 0);
    let horaFim = null;
    if (horaInicio && horas) {
      const [h, m] = horaInicio.split(':').map(Number);
      const fim = h * 60 + m + horas * 60;
      horaFim = `${String(Math.floor(fim / 60) % 24).padStart(2, '0')}:${String(fim % 60).padStart(2, '0')}`;
    }
    await criarAgenda(clienteId, projetoId, {
      data: dataDoDia.get(n), hora_inicio: horaInicio || null, hora_fim: horaFim, tipo: 'Visita',
      titulo: doDia.map((t) => t.atividade).join(' · ').slice(0, 140), dia_plano: n
    });
    criados += 1;
  }
  return { datas: datas.length, agenda: criados };
};
// ---------- Acesso do cliente (login somente leitura) ----------
export const listarAcessos = async (clienteId) => ok(await supabase.rpc('eng_usuarios_do_cliente', { p_cliente: clienteId }));
export const vincularAcesso = async (email, clienteId) => ok(await supabase.rpc('eng_vincular_usuario_cliente', { p_email: email, p_cliente: clienteId }));
export const desvincularAcesso = async (usuarioId) => ok(await supabase.rpc('eng_desvincular_usuario_cliente', { p_usuario: usuarioId }));
// ---------- Acessos e informações da implantação (senha cifrada no banco) ----------
const COLUNAS_ACESSO = 'id, cliente_id, item_id, nome, url, usuario, contato, observacao, tem_senha, senha_alterada_em, created_at, updated_at';

export const listarAcessosImpl = async (clienteId) => ok(
  await supabase.from('bpo_acessos').select(COLUNAS_ACESSO).eq('cliente_id', clienteId).order('created_at')
);

export const criarAcessoImpl = async (clienteId, itemId, dados) => ok(
  await supabase.from('bpo_acessos').insert({ cliente_id: clienteId, item_id: itemId || null, nome: 'Novo acesso', ...dados }).select(COLUNAS_ACESSO).single()
);

export const atualizarAcessoImpl = async (id, dados) => ok(
  await supabase.from('bpo_acessos').update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select(COLUNAS_ACESSO).single()
);

export const excluirAcessoImpl = async (id) => ok(await supabase.from('bpo_acessos').delete().eq('id', id));

export const definirSenhaAcesso = async (id, senha) => ok(await supabase.rpc('bpo_definir_senha_acesso', { p_id: id, p_senha: senha }));
export const revelarSenhaAcesso = async (id) => ok(await supabase.rpc('bpo_revelar_senha_acesso', { p_id: id }));