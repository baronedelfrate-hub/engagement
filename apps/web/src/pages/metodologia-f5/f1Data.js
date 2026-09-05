import { Building2, Calculator, BarChart2, AlertTriangle, Users, FileText, Target, ShieldCheck, Briefcase, Activity, Landmark, Lightbulb, Rocket, Megaphone, Laptop } from 'lucide-react';

export const MATURITY_LEVELS = [
  {
    label: 'Crítico',
    maxPercent: 20,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
    icon: AlertTriangle,
    description: 'A empresa corre sérios riscos de continuidade. A gestão é baseada no "feeling" e há mistura patrimonial.',
    recommendation: 'URGENTE: Separar contas PF/PJ, implantar controle de caixa diário e buscar ajuda especializada.'
  },
  {
    label: 'Baixo',
    maxPercent: 40,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-600',
    icon: Building2,
    description: 'Processos manuais e controles frágeis. O dono é o gargalo da operação e as informações financeiras não são confiáveis.',
    recommendation: 'Priorizar a implantação de rotinas financeiras básicas (contas a pagar/receber) e organização documental.'
  },
  {
    label: 'Intermediário',
    maxPercent: 60,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-600',
    icon: Calculator,
    description: 'Existem controles e sistema, mas a gestão ainda é reativa. Falta análise estratégica dos dados gerados.',
    recommendation: 'Estruturar DRE Gerencial, Fluxo de Caixa Projetado e iniciar reuniões mensais de resultados.'
  },
  {
    label: 'Estruturado',
    maxPercent: 80,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-600',
    icon: BarChart2,
    description: 'Empresa profissionalizada. Dados confiáveis, processos definidos e liderança descentralizada.',
    recommendation: 'Focar em governança, auditoria, planejamento orçamentário anual e otimização tributária.'
  },
  {
    label: 'Alta Performance',
    maxPercent: 100,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-600',
    icon: Rocket,
    description: 'Excelência em gestão. Cultura de dados, inovação constante e alta previsibilidade de resultados.',
    recommendation: 'Expansão de mercado, fusões/aquisições (M&A) e formação de novas lideranças.'
  }
];

export const SCORING_OPTIONS = [
  { value: 0, label: '0 - Inexistente' },
  { value: 1, label: '1 - Muito Fraco' },
  { value: 2, label: '2 - Fraco' },
  { value: 3, label: '3 - Regular' },
  { value: 4, label: '4 - Bom' },
  { value: 5, label: '5 - Excelente' }
];

export const FORM_SECTIONS = [
  {
    id: 'dados_cadastrais',
    title: '1. Dados Cadastrais',
    icon: Building2,
    fields: [
      { id: 'razao_social', label: 'Razão Social', type: 'text', width: 'full' },
      { id: 'nome_fantasia', label: 'Nome Fantasia', type: 'text', width: 'half' },
      { id: 'cnpj', label: 'CNPJ', type: 'cnpj', width: 'half' },
      { id: 'endereco_completo', label: 'Endereço Completo', type: 'text', width: 'full' },
      { id: 'cidade', label: 'Cidade', type: 'text', width: 'half' },
      { id: 'estado', label: 'Estado (UF)', type: 'text', width: 'half' },
      { id: 'responsavel_diagnostico', label: 'Responsável pelo Diagnóstico', type: 'text', width: 'half' },
      { id: 'email_contato', label: 'E-mail de Contato', type: 'email', width: 'half' }
    ]
  },
  {
    id: 'regime_tributario',
    title: '2. Regime Tributário',
    icon: FileText,
    fields: [
      { 
        id: 'regime', 
        label: 'Regime Atual', 
        type: 'select', 
        options: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'], 
        width: 'half' 
      },
      { id: 'cnae', label: 'CNAE Principal', type: 'text', width: 'half' },
      { id: 'data_fundacao', label: 'Data de Fundação', type: 'date', width: 'half' },
      { id: 'contador', label: 'Escritório de Contabilidade', type: 'text', width: 'half' },
    ]
  },
  {
    id: 'estrutura',
    title: '3. Estrutura Organizacional',
    icon: Users,
    fields: [
      { id: 'socios', label: 'Nº de Sócios', type: 'number', width: 'half' },
      { id: 'funcionarios', label: 'Nº de Colaboradores', type: 'number', width: 'half' },
      { 
        id: 'q_organograma', 
        label: 'A empresa possui organograma claro e atualizado?', 
        type: 'score' 
      },
      { 
        id: 'q_papeis', 
        label: 'As funções e responsabilidades de cada setor estão formalizadas?', 
        type: 'score' 
      },
      { 
        id: 'q_lideranca', 
        label: 'Existem líderes intermediários com autonomia para tomada de decisão?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'faturamento',
    title: '4. Faturamento',
    icon: Briefcase,
    fields: [
      { id: 'faturamento_medio', label: 'Faturamento Médio Mensal (R$)', type: 'money', width: 'half' },
      { id: 'ticket_medio', label: 'Ticket Médio Aproximado (R$)', type: 'money', width: 'half' },
      { 
        id: 'q_previsibilidade', 
        label: 'Qual o nível de previsibilidade da receita (contratos recorrentes)?', 
        type: 'score' 
      },
      { 
        id: 'q_crescimento', 
        label: 'Como você avalia o crescimento do faturamento nos últimos 12 meses?', 
        type: 'score' 
      },
      {
        id: 'q_diversificacao',
        label: 'A carteira de clientes é diversificada (nenhum cliente representa > 20%)?',
        type: 'score'
      }
    ]
  },
  {
    id: 'fluxos',
    title: '5. Fluxos Financeiros',
    icon: Activity,
    fields: [
      { 
        id: 'q_conciliacao', 
        label: 'A conciliação bancária é realizada diariamente sem falhas?', 
        type: 'score' 
      },
      { 
        id: 'q_contas_pagar', 
        label: 'O processo de contas a pagar segue um fluxo de aprovação rigoroso?', 
        type: 'score' 
      },
      { 
        id: 'q_inadimplencia', 
        label: 'Existe um processo eficaz de gestão da inadimplência e cobrança?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'controles',
    title: '6. Controles Internos',
    icon: ShieldCheck,
    fields: [
      { 
        id: 'q_separacao', 
        label: 'Existe separação TOTAL entre as contas dos sócios e da empresa?', 
        type: 'score' 
      },
      { 
        id: 'q_estoque', 
        label: 'O controle de estoque (se aplicável) bate com o físico?', 
        type: 'score' 
      },
      { 
        id: 'q_auditoria', 
        label: 'Existem rotinas de conferência/auditoria interna periódicas?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'ferramentas',
    title: '7. Ferramentas',
    icon: Calculator,
    fields: [
      { 
        id: 'q_erp', 
        label: 'A empresa utiliza um sistema de gestão (ERP) integrado?', 
        type: 'score' 
      },
      { 
        id: 'q_automacao', 
        label: 'Nível de automação dos processos financeiros (baixa intervenção manual)?', 
        type: 'score' 
      },
      { 
        id: 'q_integracao', 
        label: 'As ferramentas (Vendas, Estoque, Financeiro) conversam entre si?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'indicadores',
    title: '8. Indicadores',
    icon: Target,
    fields: [
      { 
        id: 'q_dre', 
        label: 'A empresa analisa o DRE Gerencial mensalmente?', 
        type: 'score' 
      },
      { 
        id: 'q_fluxo_caixa', 
        label: 'Existe Fluxo de Caixa Projetado para os próximos 3 a 6 meses?', 
        type: 'score' 
      },
      { 
        id: 'q_kpis', 
        label: 'Os indicadores-chave (Margem, EBITDA, Ponto de Equilíbrio) são conhecidos?', 
        type: 'score' 
      }
    ]
  },
  // --- NOVOS BLOCOS ---
  {
    id: 'pessoas',
    title: '9. Gestão de Pessoas',
    icon: Users,
    fields: [
      { 
        id: 'q_turnover', 
        label: 'O índice de rotatividade (turnover) da equipe é baixo?', 
        type: 'score' 
      },
      { 
        id: 'q_treinamento', 
        label: 'Existe um programa de treinamento e desenvolvimento contínuo?', 
        type: 'score' 
      },
      { 
        id: 'q_clima', 
        label: 'O clima organizacional é monitorado e considerado positivo?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'marketing',
    title: '10. Marketing e Vendas',
    icon: Megaphone,
    fields: [
      { 
        id: 'q_canais', 
        label: 'A empresa utiliza múltiplos canais de aquisição de clientes?', 
        type: 'score' 
      },
      { 
        id: 'q_crm', 
        label: 'Existe uso efetivo de CRM para gestão do funil de vendas?', 
        type: 'score' 
      },
      { 
        id: 'q_branding', 
        label: 'A marca possui posicionamento claro e reconhecido no mercado?', 
        type: 'score' 
      }
    ]
  },
  {
    id: 'tecnologia',
    title: '11. Tecnologia e Inovação',
    icon: Laptop,
    fields: [
      { 
        id: 'q_digital', 
        label: 'A empresa possui maturidade digital em seus processos?', 
        type: 'score' 
      },
      { 
        id: 'q_seguranca', 
        label: 'Existem políticas claras de segurança da informação e backup?', 
        type: 'score' 
      },
      { 
        id: 'q_inovacao', 
        label: 'A empresa investe regularmente em inovação de produtos/serviços?', 
        type: 'score' 
      }
    ]
  }
];