// Questionário de diagnóstico (B1 · Bloco 01 — empresas de serviço) e diagnóstico de maturidade.
// Tipos: texto, area, numero, unica (uma opção), multipla (várias opções). "dica" é nota interna do consultor.

const SN = ['Sim', 'Não'];

export const SECOES_QUESTIONARIO = [
  {
    id: '1', titulo: 'Identificação do Cliente',
    perguntas: [
      { id: '1.1', texto: 'Razão social / Nome do profissional', tipo: 'texto' },
      { id: '1.2', texto: 'Nome fantasia', tipo: 'texto' },
      { id: '1.3', texto: 'Área de atuação (ex.: odontologia, psicologia, arquitetura, engenharia, consultoria)', tipo: 'texto' },
      { id: '1.4', texto: 'Natureza jurídica', tipo: 'unica', opcoes: ['MEI', 'ME / Simples', 'Sociedade (LTDA)', 'Autônomo (PF)', 'Profissional com PJ própria'] },
      { id: '1.5', texto: 'A operação mistura pessoa física e pessoa jurídica? (recebe como PF e como PJ)', tipo: 'unica', opcoes: ['Sim, bastante', 'Um pouco', 'Não, tudo pela PJ'], dica: 'Ponto crítico em serviço: pró-labore, contas pessoais e da empresa costumam estar misturados.' }
    ]
  },
  {
    id: '2', titulo: 'Estrutura do Financeiro',
    perguntas: [
      { id: '2.1', texto: 'Como está estruturado o financeiro atualmente?', tipo: 'unica', opcoes: ['O próprio dono/profissional cuida', 'Secretária / recepção acumula', 'Tem alguém dedicado', 'Já é terceirizado (parcial ou total)'] },
      { id: '2.2', texto: 'Quantas pessoas cuidam do financeiro (mesmo que em tempo parcial)?', tipo: 'texto' },
      { id: '2.3', texto: 'Existe segregação de funções? (quem paga não é quem concilia)', tipo: 'unica', opcoes: ['Sim', 'Não', 'Não se aplica (uma pessoa só)'] },
      { id: '2.4', texto: 'O profissional/dono ainda executa tarefas financeiras operacionais (paga boleto, emite nota)?', tipo: 'unica', opcoes: ['Sim, diariamente', 'Às vezes', 'Não'], dica: 'Mede o grau de dependência da pessoa — o que a Consultoria F5 existe para resolver.' }
    ]
  },
  {
    id: '3', titulo: 'Sistemas & Tecnologia',
    perguntas: [
      { id: '3.1', texto: 'Qual sistema de gestão / ERP é utilizado (se houver)?', tipo: 'texto' },
      { id: '3.2', texto: 'Existe sistema de agenda / prontuário / gestão de projetos que gera o faturamento?', tipo: 'unica', opcoes: ['Sim, integrado ao financeiro', 'Sim, mas separado do financeiro', 'Não'], dica: 'Em serviço, o faturamento nasce na agenda (saúde) ou no projeto/contrato (técnico), não num pedido de compra.' },
      { id: '3.3', texto: 'Quais controles são feitos hoje fora do sistema (planilhas)?', tipo: 'multipla', opcoes: ['Fluxo de caixa', 'Inadimplência', 'Repasses / comissões', 'Conciliação', 'Nenhum'] },
      { id: '3.4', texto: 'Existe integração entre o sistema e o banco?', tipo: 'unica', opcoes: ['Sim', 'Parcial', 'Não'] }
    ]
  },
  {
    id: '4', titulo: 'Estrutura Bancária',
    perguntas: [
      { id: '4.1', texto: 'Quantos bancos a empresa utiliza?', tipo: 'texto' },
      { id: '4.2', texto: 'Quantas contas bancárias ativas existem no total?', tipo: 'texto', dica: 'Nº de contas (não de bancos) é o que dita o volume de conciliação — e entra na precificação.' },
      { id: '4.3', texto: 'Há separação entre conta da empresa e conta pessoal do sócio/profissional?', tipo: 'unica', opcoes: ['Sim, totalmente', 'Parcialmente', 'Não, é tudo junto'] },
      { id: '4.4', texto: 'Existem contas separadas por finalidade?', tipo: 'multipla', opcoes: ['Operação', 'Impostos / reserva', 'Investimentos', 'Não há separação'] },
      { id: '4.5', texto: 'Com que frequência a conciliação bancária é feita?', tipo: 'unica', opcoes: ['Diariamente', 'Semanalmente', 'Mensalmente', 'Não é feita formalmente'] }
    ]
  },
  {
    id: '5', titulo: 'Faturamento & Recebimentos',
    perguntas: [
      { id: '5.1', texto: 'Como o serviço é cobrado, principalmente?', tipo: 'unica', opcoes: ['Por procedimento / sessão', 'Por hora', 'Por projeto / contrato', 'Mensalidade / pacote', 'Misto'] },
      { id: '5.2', texto: 'A empresa atende convênios, planos ou repassa/recebe de terceiros?', tipo: 'unica', opcoes: ['Sim, convênios/planos', 'Sim, repasse de/para outra clínica ou empresa', 'Não, atendimento particular'], dica: 'Convênio e repasse trazem glosa, prazo longo e conciliação própria — inexistentes na indústria.' },
      { id: '5.3', texto: 'Quando há convênio: existe controle de glosas (valores negados/reduzidos)?', tipo: 'unica', opcoes: ['Sim', 'Não', 'Não se aplica'] },
      { id: '5.4', texto: 'Quais formas de recebimento a empresa usa?', tipo: 'multipla', opcoes: ['PIX', 'Cartão (crédito/débito)', 'Boleto', 'Link de pagamento', 'Dinheiro', 'Transferência'] },
      { id: '5.5', texto: 'Quando usa cartão/gateway: existe conferência das taxas e do repasse da adquirente?', tipo: 'unica', opcoes: SN, dica: 'Taxa de maquininha e prazo de repasse "somem" do caixa se ninguém concilia — dor clássica de serviço.' },
      { id: '5.6', texto: 'Como as notas fiscais de serviço (NFS-e) são emitidas?', tipo: 'unica', opcoes: ['Automático pelo sistema', 'Manual na prefeitura', 'Contador emite', 'Não emite sempre'] },
      { id: '5.7', texto: 'Existe rotina formal de cobrança de inadimplentes?', tipo: 'unica', opcoes: SN },
      { id: '5.8', texto: 'Descreva brevemente o fluxo de cobrança atual (quando e como cobra)', tipo: 'area' }
    ]
  },
  {
    id: '6', titulo: 'Contas a Pagar',
    perguntas: [
      { id: '6.1', texto: 'O processo de contas a pagar está formalizado?', tipo: 'unica', opcoes: SN },
      { id: '6.2', texto: 'Como são recebidas as notas de serviço e documentos a pagar?', tipo: 'multipla', opcoes: ['E-mail financeiro', 'E-mail pessoal', 'WhatsApp', 'Entrega física', 'Portal do fornecedor'] },
      { id: '6.3', texto: 'Como são recebidas as contas fixas (aluguel, energia, água, internet)?', tipo: 'multipla', opcoes: ['E-mail', 'Portal', 'Débito automático', 'Manual'] },
      { id: '6.4', texto: 'Como chega a folha de pagamento / pró-labore?', tipo: 'multipla', opcoes: ['Escritório contábil', 'RH interno', 'Sistema', 'Manual', 'Não se aplica'] },
      { id: '6.5', texto: 'Como chegam os impostos e guias?', tipo: 'multipla', opcoes: ['Escritório contábil', 'Fiscal interno', 'Sistema', 'Manual'] },
      { id: '6.6', texto: 'Existe fluxo formal de aprovação antes do pagamento?', tipo: 'unica', opcoes: SN },
      { id: '6.7', texto: 'Existe prazo limite para envio de documentos ao financeiro?', tipo: 'unica', opcoes: SN }
    ]
  },
  {
    id: '7', titulo: 'Volume da Operação',
    nota: 'Estas respostas são a base do dimensionamento do serviço. Informe números médios por mês.',
    perguntas: [
      { id: '7.1', texto: 'Faturamento médio mensal (faixa)', tipo: 'unica', opcoes: ['Até R$ 30 mil', 'R$ 30–80 mil', 'R$ 80–200 mil', 'R$ 200–500 mil', 'Acima de R$ 500 mil'] },
      { id: '7.2', texto: 'Quantos lançamentos financeiros por mês, em média? (contas a pagar + receber + movimentos)', tipo: 'numero', volume: 'lancamentos', dica: 'Definição a alinhar com o cliente: cada documento pago ou recebido = 1 lançamento.' },
      { id: '7.3', texto: 'Quantas notas de serviço (NFS-e) são emitidas por mês?', tipo: 'numero', volume: 'notas' },
      { id: '7.4', texto: 'Quantos atendimentos / sessões / projetos faturados por mês (aprox.)?', tipo: 'numero', volume: 'atendimentos' },
      { id: '7.5', texto: 'Quantos fornecedores/prestadores ativos a empresa paga por mês?', tipo: 'numero', volume: 'fornecedores' },
      { id: '7.6', texto: 'Quantos CNPJs serão atendidos neste contrato?', tipo: 'numero', volume: 'cnpjs' },
      { id: '7.7', texto: 'Quantas contas bancárias serão conciliadas?', tipo: 'numero', volume: 'contas' }
    ]
  },
  {
    id: '8', titulo: 'Situação de Caixa e Contabilidade',
    perguntas: [
      { id: '8.1', texto: 'Hoje a empresa costuma fechar o mês com caixa', tipo: 'unica', opcoes: ['Sobrando', 'No limite', 'Faltando (usa cheque especial/empréstimo)', 'Não sei dizer'] },
      { id: '8.2', texto: 'A empresa tem dívidas bancárias ou empréstimos em andamento?', tipo: 'unica', opcoes: SN },
      { id: '8.3', texto: 'Está em dia com fornecedores e impostos?', tipo: 'unica', opcoes: ['Sim', 'Atraso pontual', 'Atraso recorrente'] },
      { id: '8.4', texto: 'Existe reserva/capital de giro separado?', tipo: 'unica', opcoes: SN },
      { id: '8.5', texto: 'Quem faz a contabilidade?', tipo: 'unica', opcoes: ['Escritório externo', 'Interno', 'Não tem contabilidade ativa'] },
      { id: '8.6', texto: 'Como é a relação e a troca de informações com a contabilidade?', tipo: 'unica', opcoes: ['Boa e organizada', 'Existe, mas falha', 'Praticamente não há troca'] },
      { id: '8.7', texto: 'A contabilidade devolve balancete/relatórios em que prazo?', tipo: 'unica', opcoes: ['Até o mês seguinte', 'Com atraso', 'Não devolve de forma útil'] }
    ]
  },
  {
    id: '9', titulo: 'Governança & Controles',
    perguntas: [
      { id: '9.1', texto: 'Existe política financeira formal documentada?', tipo: 'unica', opcoes: SN },
      { id: '9.2', texto: 'Existe alçada de aprovação por valor?', tipo: 'unica', opcoes: SN },
      { id: '9.3', texto: 'Existe rotina formal de fechamento financeiro mensal?', tipo: 'unica', opcoes: SN },
      { id: '9.4', texto: 'O fluxo de caixa é projetado para quantos dias à frente?', tipo: 'texto' },
      { id: '9.5', texto: 'Quais indicadores financeiros são acompanhados hoje?', tipo: 'texto' },
      { id: '9.6', texto: 'A diretoria/dono recebe um relatório financeiro mensal estruturado?', tipo: 'unica', opcoes: SN }
    ]
  },
  {
    id: '10', titulo: 'Perguntas Estratégicas Finais',
    perguntas: [
      { id: '10.1', texto: 'Quais são hoje as maiores dores do financeiro?', tipo: 'area' },
      { id: '10.2', texto: 'Onde você acredita que mais perde dinheiro?', tipo: 'area' },
      { id: '10.3', texto: 'O que precisa melhorar com urgência?', tipo: 'area' }
    ]
  }
];

// Consolidação — uso interno Engagement (não vai no relatório do cliente)
export const CONSOLIDACAO = [
  { id: 'C.1', texto: 'Classificação de maturidade financeira do cliente (o consultor pode ajustar)', tipo: 'unica', opcoes: ['Caótico (sem controle)', 'Básico (controla, mas informal)', 'Organizado (processo existe)', 'Estruturado (só precisa manter)'] },
  { id: 'C.3', texto: 'Plano recomendado', tipo: 'unica', opcoes: ['Básico', 'Essencial', 'Profissional', 'Estratégico'] },
  { id: 'C.4', texto: 'Fase inicial sugerida (por onde começar)', tipo: 'unica', opcoes: ['B1 completo', 'Direto ao B2', 'Precisa de F5 antes (estruturação)'] },
  { id: 'C.5', texto: 'Observações e riscos para a proposta', tipo: 'area' }
];

export const ESCALA_MATURIDADE = [
  { valor: 0, rotulo: 'Não existe / caótico' },
  { valor: 1, rotulo: 'Informal / às vezes' },
  { valor: 2, rotulo: 'Organizado' },
  { valor: 3, rotulo: 'Estruturado / sempre' }
];

export const DIMENSOES_MATURIDADE = [
  { id: 'A', titulo: 'Organização e Processos', itens: [
    'Existe processo formal e documentado de contas a pagar/receber',
    'Os documentos têm padrão de arquivamento e nomenclatura',
    'Há segregação de funções (quem paga não concilia)',
    'Existe prazo definido para envio de documentos ao financeiro'
  ] },
  { id: 'B', titulo: 'Sistema e Controles', itens: [
    'A empresa usa um sistema/ERP financeiro (não só planilha)',
    'A conciliação bancária é feita com regularidade',
    'Não há controles paralelos críticos fora do sistema',
    'Contas da empresa e pessoais estão separadas'
  ] },
  { id: 'C', titulo: 'Informação e Gestão', itens: [
    'Existe fluxo de caixa projetado e atualizado',
    'Há fechamento financeiro mensal com rotina definida',
    'A empresa acompanha indicadores financeiros',
    'A direção recebe relatório financeiro mensal estruturado'
  ] },
  { id: 'D', titulo: 'Governança', itens: [
    'Existe política financeira formal documentada',
    'Há alçada de aprovação definida por valor',
    'A empresa está em dia com impostos e fornecedores',
    'Existe reserva / capital de giro separado'
  ] }
];

export const TOTAL_ITENS_MATURIDADE = DIMENSOES_MATURIDADE.reduce((s, d) => s + d.itens.length, 0); // 16
export const MAX_PONTOS = TOTAL_ITENS_MATURIDADE * 3; // 48

// Mesma regra do banco (trigger bpo_calcular_diagnostico), para mostrar o resultado enquanto o consultor preenche.
export const calcularMaturidade = (respostas) => {
  const v = (respostas || []).filter((x) => Number.isInteger(x) && x >= 0 && x <= 3);
  if (v.length === 0) return { respondidos: 0, pontos: 0, indice: null, nivel: null };
  const pontos = v.reduce((s, x) => s + x, 0);
  const indice = Math.round((pontos * 100) / MAX_PONTOS);
  const nivel = indice <= 33 ? 'Caótico' : indice <= 57 ? 'Básico' : indice <= 79 ? 'Organizado' : 'Estruturado';
  return { respondidos: v.length, pontos, indice, nivel };
};

export const faixaVolume = (lancamentos) => {
  const n = Number(lancamentos);
  if (!Number.isFinite(n) || lancamentos === '' || lancamentos === null || lancamentos === undefined) return null;
  return n <= 50 ? 'Pequeno' : n <= 120 ? 'Médio' : n <= 200 ? 'Grande' : 'Muito grande';
};

export const planoRecomendado = (nivel, lancamentos) => {
  const n = Number(lancamentos);
  if (!nivel || !Number.isFinite(n) || lancamentos === '' || lancamentos === null || lancamentos === undefined) return null;
  if (nivel === 'Caótico') return n <= 120 ? 'Estruturação F5 (antes do BPO)' : 'F5 + Básico';
  if (nivel === 'Básico') return n <= 120 ? 'Básico' : 'Essencial';
  if (nivel === 'Organizado') return 'Profissional';
  return 'Estratégico';
};

export const EXPLICACAO_NIVEL = {
  'Caótico': 'O financeiro hoje depende de pessoas e de improviso. O primeiro passo é estruturar a operação antes de terceirizá-la.',
  'Básico': 'Existe algum controle, mas ele é informal. O foco é organizar a rotina e assumir a operação com método.',
  'Organizado': 'O processo existe e funciona. O foco é ganhar controle gerencial: fechamento, resultado e fluxo projetado.',
  'Estruturado': 'A base está sólida. O foco é governança, leitura dos números e educação financeira.'
};
