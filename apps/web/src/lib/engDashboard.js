// Regras do painel de acompanhamento dos clientes da Engagement (BPO E5 e Consultoria F5).
// Funções puras: recebem os registros já carregados e a data de hoje (AAAA-MM-DD).

const pendente = (t) => !['concluido', 'na'].includes(t.status);

export const diasEntre = (de, ate) => Math.round((new Date(`${ate}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000);

export const somaDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const FASES_BPO = [
  'Onboarding não iniciado',
  'Bloco 01 — Diagnóstico e processo',
  'Bloco 02 — Implantação técnica',
  'B1 concluído (pronto para go-live)',
  'Em operação'
];

export const SITUACOES = {
  em_dia: { rotulo: 'Em dia', cor: '#16a34a' },
  atencao: { rotulo: 'Atenção', cor: '#d97706' },
  atrasado: { rotulo: 'Atrasado', cor: '#dc2626' },
  sem_dados: { rotulo: 'Sem cronograma', cor: '#94a3b8' }
};

// Situação pelo que está em atraso (prazo vencido) ou perto de vencer (próximos 3 dias).
export const situacaoDe = ({ atrasadas, proximas, temDados }) => {
  if (!temDados) return 'sem_dados';
  if (atrasadas > 0) return 'atrasado';
  if (proximas > 0) return 'atencao';
  return 'em_dia';
};

const atrasadasDe = (tarefas, hoje) => tarefas.filter((t) => pendente(t) && t.data_prevista && t.data_prevista < hoje);
const proximasDe = (tarefas, hoje) => tarefas.filter((t) => pendente(t) && t.data_prevista && t.data_prevista >= hoje && t.data_prevista <= somaDias(hoje, 3));

const progresso = (tarefas) => {
  const aplic = tarefas.filter((t) => t.status !== 'na');
  const feitas = aplic.filter((t) => t.status === 'concluido').length;
  return { total: aplic.length, feitas, pct: aplic.length ? Math.round((feitas / aplic.length) * 100) : 0 };
};

// Fase atual do cliente de BPO a partir do onboarding B1.
export const faseBpo = (cliente, tarefasB1) => {
  if (cliente.status_contrato === 'em_operacao') return 'Em operação';
  if (tarefasB1.length === 0) return 'Onboarding não iniciado';
  const bloco = (n) => tarefasB1.filter((t) => String(t.fase || '').includes(`Bloco 0${n}`));
  if (bloco(1).some(pendente)) return FASES_BPO[1];
  if (bloco(2).some(pendente)) return FASES_BPO[2];
  return FASES_BPO[3];
};

// Fase atual do projeto de Consultoria: a primeira fase (pela ordem do plano) que ainda tem atividade pendente.
export const faseConsultoria = (tarefas) => {
  if (tarefas.length === 0) return 'Sem cronograma';
  const ordenadas = [...tarefas].sort((a, b) => (a.dia_plano ?? 9999) - (b.dia_plano ?? 9999));
  const aberta = ordenadas.find(pendente);
  return aberta ? (aberta.fase || 'Atividades') : 'Projeto concluído';
};

// dados: { clientes, tarefas, agenda, entregaveis, implantacao, projetos }
export const montarPainel = (servico, dados, hoje) => {
  const origem = servico === 'bpo' ? 'b1' : 'f5';
  const clientes = dados.clientes.filter((c) => (c.servicos || []).includes(servico) && c.status_contrato !== 'encerrado');
  const linhas = clientes.map((c) => {
    const tarefas = dados.tarefas.filter((t) => t.cliente_id === c.id && t.origem === origem);
    const atras = atrasadasDe(tarefas, hoje);
    const prox = proximasDe(tarefas, hoje);
    const agenda = dados.agenda.filter((a) => a.cliente_id === c.id);
    const visitasSemAtualizar = servico === 'consultoria' ? agenda.filter((a) => a.data < hoje && a.status === 'agendada') : [];
    const proxima = agenda.filter((a) => a.data >= hoje && a.status === 'agendada').sort((a, b) => a.data.localeCompare(b.data))[0] || null;
    const ent = dados.entregaveis.filter((e) => e.cliente_id === c.id && e.status !== 'na');
    const impl = dados.implantacao.filter((i) => i.cliente_id === c.id && i.status !== 'na');
    const proxPrazos = tarefas.filter((t) => pendente(t) && t.data_prevista).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))[0] || null;
    const sit = situacaoDe({
      atrasadas: atras.length + visitasSemAtualizar.length,
      proximas: prox.length + (proxima && proxima.data <= somaDias(hoje, 3) ? 1 : 0),
      temDados: tarefas.length > 0
    });
    return {
      cliente: c,
      fase: servico === 'bpo' ? faseBpo(c, tarefas) : faseConsultoria(tarefas),
      progresso: progresso(tarefas),
      atrasadas: atras,
      visitasSemAtualizar,
      proxima,
      proxPrazo: proxPrazos,
      entregas: { total: ent.length, feitas: ent.filter((e) => e.status === 'concluido').length },
      implantacao: { total: impl.length, ok: impl.filter((i) => i.status === 'ok').length },
      situacao: sit
    };
  });

  const contar = (chaveFn) => linhas.reduce((acc, l) => { const k = chaveFn(l); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const porFase = contar((l) => l.fase);
  const porSituacao = contar((l) => l.situacao);
  const ordemFases = servico === 'bpo' ? FASES_BPO : Object.keys(porFase).sort();

  const atrasos = linhas.flatMap((l) => [
    ...l.atrasadas.map((t) => ({ cliente: l.cliente, titulo: t.atividade, fase: t.fase, prazo: t.data_prevista, dias: diasEntre(t.data_prevista, hoje), tipo: 'Atividade' })),
    ...l.visitasSemAtualizar.map((a) => ({ cliente: l.cliente, titulo: `Visita: ${a.titulo}`, fase: null, prazo: a.data, dias: diasEntre(a.data, hoje), tipo: 'Visita sem atualização' }))
  ]).sort((a, b) => b.dias - a.dias);

  const proximosCompromissos = dados.agenda
    .filter((a) => a.status === 'agendada' && a.data >= hoje && a.data <= somaDias(hoje, 14) && clientes.some((c) => c.id === a.cliente_id))
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((a) => ({ ...a, cliente: clientes.find((c) => c.id === a.cliente_id) }));

  return {
    linhas,
    total: linhas.length,
    porFase: ordemFases.map((f) => ({ fase: f, qtd: porFase[f] || 0 })).filter((x) => servico === 'bpo' || x.qtd > 0),
    porSituacao,
    atrasos,
    proximosCompromissos
  };
};
