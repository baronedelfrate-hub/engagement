export const PHASE_NAMES = {
  'B1': 'Onboarding / Diagnóstico',
  'B2': 'Operação Assistida',
  'B3': 'Controle e Estabilização',
  'B4': 'Reporte e Análise',
  'B5': 'BPO Academy / Melhoria Contínua'
};

export const PHASE_COLORS = {
  'B1': 'bg-blue-100 text-blue-800 border-blue-200',
  'B2': 'bg-purple-100 text-purple-800 border-purple-200',
  'B3': 'bg-orange-100 text-orange-800 border-orange-200',
  'B4': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'B5': 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

export const STATUS_COLORS = {
  'Pendente': 'bg-muted text-muted-foreground border-border',
  'Em andamento': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
};

export const PHASE_CONFIGS = {
  'B1': {
    name: PHASE_NAMES['B1'],
    description: 'Fase inicial de levantamento de dados, mapeamento de processos e configuração inicial.',
    required_uploads: ['plano_contas', 'relatorio_diagnostico'],
    diagnostico_fields: [
      { name: 'sistema_erp', label: 'Sistema ERP Atual', type: 'text', required: true },
      { name: 'volume_notas', label: 'Volume Médio de Notas/Mês', type: 'number', required: true },
      { name: 'principais_gargalos', label: 'Principais Gargalos', type: 'textarea', required: false }
    ],
    analise_fields: [
      { name: 'adequacao_plano', label: 'Adequação do Plano de Contas', type: 'select', options: ['Apto', 'Necessita Revisão', 'Inadequado'], required: true },
      { name: 'parecer_analista', label: 'Parecer do Analista', type: 'textarea', required: true }
    ],
    implantacao_fields: [
      { name: 'data_kickoff', label: 'Data da Reunião de Kick-off', type: 'date', required: true },
      { name: 'acessos_liberados', label: 'Acessos Liberados', type: 'select', options: ['Sim', 'Parcial', 'Não'], required: true }
    ]
  },
  'B2': {
    name: PHASE_NAMES['B2'],
    description: 'Execução das rotinas diárias com acompanhamento próximo.',
    required_uploads: ['documentos_padronizados'],
    diagnostico_fields: [
      { name: 'processamento_diario', label: 'Processamento Diário Estabelecido?', type: 'select', options: ['Sim', 'Não'], required: true }
    ],
    analise_fields: [
      { name: 'desvios_identificados', label: 'Desvios Identificados na Operação', type: 'textarea', required: false }
    ],
    implantacao_fields: [
      { name: 'treinamento_equipe', label: 'Treinamento da Equipe Concluído', type: 'select', options: ['Sim', 'Não'], required: true }
    ]
  },
  'B3': {
    name: PHASE_NAMES['B3'],
    description: 'Estabilização das rotinas e garantia da qualidade dos dados.',
    required_uploads: [],
    diagnostico_fields: [],
    analise_fields: [
      { name: 'taxa_erros', label: 'Taxa Média de Erros (%)', type: 'number', required: true }
    ],
    implantacao_fields: []
  },
  'B4': {
    name: PHASE_NAMES['B4'],
    description: 'Geração e análise de relatórios gerenciais.',
    required_uploads: ['aprovacao_cliente'],
    diagnostico_fields: [],
    analise_fields: [],
    implantacao_fields: [
      { name: 'dashboards_configurados', label: 'Dashboards Configurados', type: 'select', options: ['Sim', 'Não'], required: true }
    ]
  },
  'B5': {
    name: PHASE_NAMES['B5'],
    description: 'Treinamento contínuo e evolução dos processos.',
    required_uploads: ['comprovante_implantacao'],
    diagnostico_fields: [],
    analise_fields: [],
    implantacao_fields: [
      { name: 'feedbacks_coletados', label: 'Feedbacks Coletados', type: 'textarea', required: false }
    ]
  }
};