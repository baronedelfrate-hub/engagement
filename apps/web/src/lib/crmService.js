// CRM multiempresa: contas, contatos, oportunidades (funil), atividades, catálogo, propostas e textos institucionais.
import { supabase } from '@/lib/customSupabaseClient';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const ETAPAS = [
  { id: 'lead', rotulo: 'Lead', prob: 10, cor: 'border-t-slate-400' },
  { id: 'contato', rotulo: 'Contato feito', prob: 20, cor: 'border-t-sky-400' },
  { id: 'reuniao', rotulo: 'Reunião / diagnóstico', prob: 40, cor: 'border-t-indigo-400' },
  { id: 'proposta', rotulo: 'Proposta enviada', prob: 60, cor: 'border-t-amber-400' },
  { id: 'negociacao', rotulo: 'Negociação', prob: 80, cor: 'border-t-orange-500' },
  { id: 'ganho', rotulo: 'Ganho', prob: 100, cor: 'border-t-emerald-500' },
  { id: 'perdido', rotulo: 'Perdido', prob: 0, cor: 'border-t-red-400' }
];
export const ETAPA_POR_ID = Object.fromEntries(ETAPAS.map((e) => [e.id, e]));

export const TIPOS_ATIVIDADE = {
  tarefa: 'Tarefa', ligacao: 'Ligação', reuniao: 'Reunião', email: 'E-mail', whatsapp: 'WhatsApp', nota: 'Nota'
};

export const STATUS_PROPOSTA = { rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita', recusada: 'Recusada', expirada: 'Expirada' };

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- contas e contatos ----------
export const listarContas = async (companyId) => ok(await supabase.from('crm_contas').select('*').eq('company_id', companyId).order('nome'));
export const criarConta = async (companyId, d) => ok(await supabase.from('crm_contas').insert({ company_id: companyId, ...d }).select().single());
export const atualizarConta = async (id, d) => ok(await supabase.from('crm_contas').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirConta = async (id) => ok(await supabase.from('crm_contas').delete().eq('id', id));

export const listarContatos = async (companyId, contaId) => {
  let q = supabase.from('crm_contatos').select('*').eq('company_id', companyId).order('nome');
  if (contaId) q = q.eq('conta_id', contaId);
  return ok(await q);
};
export const criarContato = async (companyId, contaId, d) => ok(await supabase.from('crm_contatos').insert({ company_id: companyId, conta_id: contaId, ...d }).select().single());
export const atualizarContato = async (id, d) => ok(await supabase.from('crm_contatos').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirContato = async (id) => ok(await supabase.from('crm_contatos').delete().eq('id', id));

// ---------- oportunidades ----------
export const listarOportunidades = async (companyId) => ok(
  await supabase.from('crm_oportunidades').select('*, conta:crm_contas(id, nome), contato:crm_contatos(id, nome)').eq('company_id', companyId).order('created_at', { ascending: false })
);
export const criarOportunidade = async (companyId, d) => ok(await supabase.from('crm_oportunidades').insert({ company_id: companyId, ...d }).select().single());
export const atualizarOportunidade = async (id, d) => ok(await supabase.from('crm_oportunidades').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirOportunidade = async (id) => ok(await supabase.from('crm_oportunidades').delete().eq('id', id));

// mover no funil: ajusta probabilidade e datas de ganho/perda
export const moverEtapa = async (id, etapa, extra = {}) => {
  const campos = { etapa, probabilidade: ETAPA_POR_ID[etapa].prob, ganho_em: null, perdido_em: null, ...extra };
  if (etapa === 'ganho') campos.ganho_em = hojeISO();
  if (etapa === 'perdido') campos.perdido_em = hojeISO();
  return atualizarOportunidade(id, campos);
};

// ---------- atividades ----------
export const listarAtividades = async (companyId, filtro = {}) => {
  let q = supabase.from('crm_atividades').select('*, oportunidade:crm_oportunidades(id, titulo), conta:crm_contas(id, nome)').eq('company_id', companyId).order('data_prevista', { nullsFirst: false });
  if (filtro.oportunidadeId) q = q.eq('oportunidade_id', filtro.oportunidadeId);
  return ok(await q);
};
export const criarAtividade = async (companyId, d) => ok(await supabase.from('crm_atividades').insert({ company_id: companyId, ...d }).select().single());
export const atualizarAtividade = async (id, d) => ok(await supabase.from('crm_atividades').update(d).eq('id', id).select().single());
export const excluirAtividade = async (id) => ok(await supabase.from('crm_atividades').delete().eq('id', id));

// ---------- catálogo ----------
export const listarCatalogo = async (companyId) => ok(await supabase.from('crm_catalogo').select('*').eq('company_id', companyId).order('tipo').order('preco'));
export const criarCatalogo = async (companyId, d) => ok(await supabase.from('crm_catalogo').insert({ company_id: companyId, ...d }).select().single());
export const atualizarCatalogo = async (id, d) => ok(await supabase.from('crm_catalogo').update(d).eq('id', id).select().single());
export const excluirCatalogo = async (id) => ok(await supabase.from('crm_catalogo').delete().eq('id', id));

// ---------- textos institucionais ----------
export const carregarConfig = async (companyId) => {
  const r = ok(await supabase.from('crm_config').select('*').eq('company_id', companyId).maybeSingle());
  return r?.institucional || {};
};
export const salvarConfig = async (companyId, institucional) => ok(
  await supabase.from('crm_config').upsert({ company_id: companyId, institucional, updated_at: new Date().toISOString() }).select().single()
);

// ---------- propostas ----------
export const listarPropostas = async (companyId) => ok(
  await supabase.from('crm_propostas').select('*, conta:crm_contas(id, nome), oportunidade:crm_oportunidades(id, titulo, cliente_bpo_id)').eq('company_id', companyId).order('created_at', { ascending: false })
);
export const carregarProposta = async (id) => {
  const p = ok(await supabase.from('crm_propostas').select('*, conta:crm_contas(*), oportunidade:crm_oportunidades(id, titulo, etapa, servico, cliente_bpo_id, contato:crm_contatos(nome, email, telefone, whatsapp))').eq('id', id).single());
  const itens = ok(await supabase.from('crm_propostas_itens').select('*').eq('proposta_id', id).order('ordem'));
  return { ...p, itens };
};

// Número no padrão da apresentação: PRP + dia, mês e ano com 2 dígitos (ex.: PRP151026). Repetido no mesmo dia, ganha sufixo.
export const gerarNumeroProposta = async (companyId, data = new Date()) => {
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const aa = String(data.getFullYear()).slice(-2);
  const base = `PRP${dd}${mm}${aa}`;
  const existentes = ok(await supabase.from('crm_propostas').select('numero').eq('company_id', companyId).like('numero', `${base}%`));
  const usados = new Set(existentes.map((e) => e.numero));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
};

export const criarProposta = async (companyId, d) => ok(await supabase.from('crm_propostas').insert({ company_id: companyId, ...d }).select().single());
export const atualizarProposta = async (id, d) => ok(await supabase.from('crm_propostas').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirProposta = async (id) => ok(await supabase.from('crm_propostas').delete().eq('id', id));

// itens: substitui todos (a proposta é editada como um bloco)
export const salvarItens = async (companyId, propostaId, itens) => {
  ok(await supabase.from('crm_propostas_itens').delete().eq('proposta_id', propostaId));
  if (!itens.length) return [];
  const linhas = itens.map((i, idx) => ({
    company_id: companyId, proposta_id: propostaId, catalogo_id: i.catalogo_id || null, ordem: idx + 1,
    descricao: i.descricao, quantidade: Number(i.quantidade) || 1, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0
  }));
  return ok(await supabase.from('crm_propostas_itens').insert(linhas).select());
};

// ---------- cálculos ----------
export const totalItem = (i) => Math.max(0, (Number(i.quantidade) || 0) * (Number(i.preco_unitario) || 0) - (Number(i.desconto) || 0));
export const totalProposta = (itens, descontoGeral = 0) => Math.max(0, itens.reduce((s, i) => s + totalItem(i), 0) - (Number(descontoGeral) || 0));

// Divide o valor em n parcelas (a última absorve os centavos) com os rótulos do cronograma de pagamento.
export const dividirParcelas = (valor, n, rotulos) => {
  const total = Math.round((Number(valor) || 0) * 100);
  const base = Math.floor(total / n);
  const padrao = ['Aceite', ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => `${(i + 1) * 30} dias`)];
  return Array.from({ length: n }, (_, i) => ({
    rotulo: (rotulos && rotulos[i]) || padrao[i],
    valor: (i === n - 1 ? total - base * (n - 1) : base) / 100
  }));
};

export const PAGINAS = [
  { id: 'quem_somos', rotulo: 'Quem somos (missão e visão)', fixa: true },
  { id: 'valores', rotulo: 'Nossos valores', fixa: true },
  { id: 'ponto_partida', rotulo: 'O ponto de partida do cliente' },
  { id: 'objetivo', rotulo: 'Objetivo do projeto' },
  { id: 'escopo', rotulo: 'Escopo e frentes de trabalho' },
  { id: 'cronograma', rotulo: 'Cronograma' },
  { id: 'investimento', rotulo: 'Investimento' },
  { id: 'condicoes', rotulo: 'Condições comerciais' },
  { id: 'proximos_passos', rotulo: 'Próximos passos' }
];

export const paginasPadrao = () => Object.fromEntries(PAGINAS.map((p) => [p.id, true]));

export const conteudoPadrao = () => ({
  ponto_partida: { titulo: 'A empresa começa do zero, mas o custo já existe', destaques: [{ valor: '', rotulo: '' }], estrategia_titulo: 'Nossa estratégia', estrategia: '' },
  objetivo: { titulo: 'A estrutura mínima para iniciar as atividades', subtitulo: '', pecas: [{ titulo: '', texto: '' }] },
  escopo: { titulo: 'Frentes de trabalho em um único projeto', frentes: [{ titulo: '', prioridade: '', itens: [''] }] },
  cronograma: { titulo: 'Cronograma do projeto', semanas: 12, fases: [{ nome: '', de: 1, ate: 3 }], nota: 'Prazos estimados a partir da aprovação do escopo. Podem variar conforme o volume de informações, o nível de organização inicial, o tempo de resposta na entrega de documentos e as liberações de acesso.' },
  investimento: { titulo: 'Investimento', nota: '' },
  condicoes: { titulo: 'Prazo, faturamento e validade', itens: [{ valor: '', titulo: 'Prazo de execução', texto: '' }, { valor: '', titulo: 'Faturamento', texto: '' }, { valor: '30 dias', titulo: 'Validade da proposta', texto: 'Contados a partir do recebimento pelo cliente.' }] },
  proximos_passos: { titulo: 'Vamos começar juntos?', passos: [{ titulo: 'Aceite da proposta', texto: 'e pagamento da primeira parcela' }, { titulo: 'Início imediato', texto: '' }, { titulo: 'Operação rodando', texto: '' }] }
});

// ---------- indicadores de vendas (usados pelo painel do CRM e pela tela inicial) ----------
const mesAnterior = (hoje) => { const [a, m] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))]; return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };

// Vendas fechadas (oportunidades ganhas), conversão (ganhas ÷ ganhas+perdidas decididas no período) e ticket médio (valor ganho ÷ nº de vendas).
export const indicadoresVendas = (oportunidades, hoje = hojeISO()) => {
  const periodo = (prefixo) => {
    const g = oportunidades.filter((o) => o.etapa === 'ganho' && o.ganho_em && o.ganho_em.startsWith(prefixo));
    const p = oportunidades.filter((o) => o.etapa === 'perdido' && o.perdido_em && o.perdido_em.startsWith(prefixo));
    const valor = g.reduce((s, o) => s + Number(o.valor || 0), 0);
    return {
      ganhas: g.length, perdidas: p.length, valor,
      conversao: g.length + p.length ? Math.round((g.length / (g.length + p.length)) * 100) : null,
      ticket: g.length ? Math.round((valor / g.length) * 100) / 100 : null
    };
  };
  return { mes: periodo(hoje.slice(0, 7)), anterior: periodo(mesAnterior(hoje)), ano: periodo(hoje.slice(0, 4)) };
};

// Variação percentual entre dois valores (null quando não há base de comparação).
export const variacaoPct = (atual, anterior) => (anterior ? Math.round(((atual - anterior) / anterior) * 100) : null);

// ---------- painel ----------
export const montarPainelCrm = ({ oportunidades, atividades, propostas }, hoje) => {
  const abertas = oportunidades.filter((o) => !['ganho', 'perdido'].includes(o.etapa));
  const ganhas = oportunidades.filter((o) => o.etapa === 'ganho');
  const perdidas = oportunidades.filter((o) => o.etapa === 'perdido');
  const soma = (l) => l.reduce((s, o) => s + Number(o.valor || 0), 0);
  const ponderado = abertas.reduce((s, o) => s + Number(o.valor || 0) * (o.probabilidade / 100), 0);
  const decididas = ganhas.length + perdidas.length;
  const porEtapa = ETAPAS.filter((e) => !['ganho', 'perdido'].includes(e.id)).map((e) => {
    const l = abertas.filter((o) => o.etapa === e.id);
    return { etapa: e.rotulo, qtd: l.length, valor: soma(l) };
  });
  const pendentes = atividades.filter((a) => !a.concluida_em);
  const atrasadas = pendentes.filter((a) => a.data_prevista && a.data_prevista < hoje);
  const hojeL = pendentes.filter((a) => a.data_prevista === hoje);
  const diasParada = (o) => Math.round((new Date(`${hoje}T12:00:00`) - new Date(o.updated_at)) / 86400000);
  const paradas = abertas.filter((o) => diasParada(o) >= 14).map((o) => ({ ...o, dias: diasParada(o) })).sort((a, b) => b.dias - a.dias);
  const propostasAbertas = propostas.filter((p) => p.status === 'enviada');
  return {
    abertas: abertas.length, valorAberto: soma(abertas), ponderado, ganhas: ganhas.length, valorGanho: soma(ganhas),
    conversao: decididas ? Math.round((ganhas.length / decididas) * 100) : null,
    porEtapa, atrasadas, atividadesHoje: hojeL, paradas, propostasAbertas, vendas: indicadoresVendas(oportunidades, hoje)
  };
};
