// Quadro de tarefas (estilo Trello): quadros, colunas, cartões, comentários e o link para o Google Agenda.
import { supabase } from '@/lib/customSupabaseClient';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const PRIORIDADES = {
  baixa: { rotulo: 'Baixa', cor: 'bg-slate-100 text-slate-700 border-slate-200' },
  media: { rotulo: 'Média', cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  alta: { rotulo: 'Alta', cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgente: { rotulo: 'Urgente', cor: 'bg-red-100 text-red-700 border-red-200' }
};

export const COLUNAS_PADRAO = [
  { nome: 'A fazer', concluida: false },
  { nome: 'Em andamento', concluida: false },
  { nome: 'Aguardando', concluida: false },
  { nome: 'Concluído', concluida: true }
];

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// ---------- pessoas ----------
export const listarUsuarios = async () => ok(await supabase.rpc('usuarios_da_empresa'));

// ---------- quadros ----------
export const listarQuadros = async (companyId) => {
  const quadros = ok(await supabase.from('tarefas_quadros').select('*').eq('company_id', companyId).eq('arquivado', false).order('created_at'));
  const cartoes = ok(await supabase.from('tarefas_cartoes').select('id, quadro_id, prazo, concluido_em').eq('company_id', companyId));
  const hoje = hojeISO();
  return quadros.map((q) => {
    const meus = cartoes.filter((c) => c.quadro_id === q.id);
    const abertos = meus.filter((c) => !c.concluido_em);
    return { ...q, total: meus.length, abertos: abertos.length, atrasados: abertos.filter((c) => c.prazo && c.prazo < hoje).length };
  });
};

export const criarQuadro = async (companyId, userId, dados) => {
  const q = ok(await supabase.from('tarefas_quadros').insert({ company_id: companyId, created_by: userId, ...dados }).select().single());
  try {
    ok(await supabase.from('tarefas_colunas').insert(COLUNAS_PADRAO.map((c, i) => ({ company_id: companyId, quadro_id: q.id, nome: c.nome, ordem: i + 1, concluida: c.concluida }))));
  } catch (e) {
    await supabase.from('tarefas_quadros').delete().eq('id', q.id);
    throw e;
  }
  return q;
};
export const atualizarQuadro = async (id, d) => ok(await supabase.from('tarefas_quadros').update(d).eq('id', id).select().single());
export const excluirQuadro = async (id) => ok(await supabase.from('tarefas_quadros').delete().eq('id', id));

export const carregarQuadro = async (id) => {
  const quadro = ok(await supabase.from('tarefas_quadros').select('*').eq('id', id).single());
  const colunas = ok(await supabase.from('tarefas_colunas').select('*').eq('quadro_id', id).order('ordem'));
  const cartoes = ok(await supabase.from('tarefas_cartoes').select('*').eq('quadro_id', id).order('ordem'));
  return { quadro, colunas, cartoes };
};

// ---------- colunas ----------
export const criarColuna = async (companyId, quadroId, nome, ordem) => ok(await supabase.from('tarefas_colunas').insert({ company_id: companyId, quadro_id: quadroId, nome, ordem }).select().single());
export const atualizarColuna = async (id, d) => ok(await supabase.from('tarefas_colunas').update(d).eq('id', id).select().single());
export const excluirColuna = async (id) => ok(await supabase.from('tarefas_colunas').delete().eq('id', id));

// ---------- cartões ----------
export const criarCartao = async (companyId, userId, quadroId, colunaId, dados, ordem) => ok(
  await supabase.from('tarefas_cartoes').insert({ company_id: companyId, quadro_id: quadroId, coluna_id: colunaId, created_by: userId, ordem, ...dados }).select().single()
);
export const atualizarCartao = async (id, d) => ok(await supabase.from('tarefas_cartoes').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirCartao = async (id) => ok(await supabase.from('tarefas_cartoes').delete().eq('id', id));

// Posição dentro da coluna: média entre os vizinhos (evita reescrever a coluna toda a cada arrasto).
export const ordemEntre = (anterior, proximo) => {
  if (anterior === undefined && proximo === undefined) return 1000;
  if (anterior === undefined) return proximo - 1000;
  if (proximo === undefined) return anterior + 1000;
  return (anterior + proximo) / 2;
};

// Mover para outra coluna: a coluna "concluída" marca a data de conclusão; sair dela, limpa.
export const moverCartao = async (cartao, colunaDestino, ordem) => atualizarCartao(cartao.id, {
  coluna_id: colunaDestino.id, ordem,
  concluido_em: colunaDestino.concluida ? (cartao.concluido_em || new Date().toISOString()) : null
});

// ---------- comentários ----------
export const listarComentarios = async (cartaoId) => ok(await supabase.from('tarefas_comentarios').select('*').eq('cartao_id', cartaoId).order('created_at'));
export const criarComentario = async (companyId, userId, cartaoId, texto) => ok(await supabase.from('tarefas_comentarios').insert({ company_id: companyId, autor_id: userId, cartao_id: cartaoId, texto }).select().single());

// ---------- visões para a tela inicial ----------
export const tarefasAbertas = async (companyId) => ok(
  await supabase.from('tarefas_cartoes').select('id, quadro_id, titulo, responsavel_id, prazo, prioridade, quadro:tarefas_quadros(id, nome)').eq('company_id', companyId).is('concluido_em', null).order('prazo', { nullsFirst: false })
);

// ---------- Google Agenda ----------
// Abre o evento já preenchido no Google Agenda de quem clicar (dia inteiro, na data do prazo). Não precisa de integração.
export const linkGoogleAgenda = (cartao, quadroNome) => {
  if (!cartao.prazo) return null;
  const d = new Date(`${cartao.prazo}T12:00:00`);
  const fim = new Date(d.getTime() + 86400000);
  const f = (x) => x.toISOString().slice(0, 10).replace(/-/g, '');
  const detalhes = [cartao.descricao, quadroNome ? `Quadro: ${quadroNome}` : null, `Prioridade: ${PRIORIDADES[cartao.prioridade]?.rotulo || ''}`].filter(Boolean).join('\n\n');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: cartao.titulo, dates: `${f(d)}/${f(fim)}`, details: detalhes });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};
