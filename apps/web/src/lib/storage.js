const STORAGE_KEYS = {
  EMPRESAS: 'erp_empresas',
  CLIENTES: 'erp_clientes',
  FORNECEDORES: 'erp_fornecedores',
  PRODUTOS: 'erp_produtos',
  SERVICOS: 'erp_servicos',
  BANCOS: 'erp_bancos',
  CENTRO_CUSTOS: 'erp_centro_custos',
  CATEGORIAS: 'erp_categorias',
  SUBCATEGORIAS: 'erp_subcategorias',
  TIPO_PAGAMENTO: 'erp_tipo_pagamento',
  CONDICAO_PAGAMENTO: 'erp_condicao_pagamento',
  TIPO_DOCUMENTO: 'erp_tipo_documento',
  UNIDADES_MEDIDA: 'erp_unidades_medida',
  ORIGENS: 'erp_origens',
  TRIBUTOS: 'erp_tributos',
  ORCAMENTOS: 'erp_orcamentos',
  PEDIDOS: 'erp_pedidos',
  PEDIDOS_COMPRA: 'erp_pedidos_compra',
  CONTAS_PAGAR: 'erp_contas_pagar',
  CONTAS_RECEBER: 'erp_contas_receber',
  ENTRADA_ESTOQUE: 'erp_entrada_estoque',
  MOVIMENTACAO_ESTOQUE: 'erp_movimentacao_estoque',
  INVENTARIO: 'erp_inventario',
  PROJETOS: 'erp_projetos',
  KANBAN_CARDS: 'erp_kanban_cards',
  ETAPAS_F5: 'erp_etapas_f5',
  CHECKLIST_ETAPA: 'erp_checklist_etapa',
  F5_ETAPAS: 'erp_f5_etapas', 
  F5_CLIENTES: 'erp_f5_clientes', 
  USUARIOS: 'erp_admin_usuarios',
  ROLES: 'erp_admin_roles',
  PERMISSOES: 'erp_admin_permissoes',
  USER_ROLES: 'erp_admin_user_roles',
  ROLE_PERMISSIONS: 'erp_admin_role_permissions',
  TIMES: 'erp_admin_times',
  LOGS_AUDITORIA: 'erp_admin_logs',
  SESSOES: 'erp_admin_sessoes',
  SECURITY_CONFIG: 'erp_admin_security_config',
  INVITES: 'erp_admin_invites',
  DRE_CONFIG: 'erp_control_dre_config',
  CENARIOS_PE: 'erp_control_cenarios_pe',
  RESERVAS: 'erp_estoque_reservas',
  TRANSFERENCIAS: 'erp_estoque_transferencias',
  FICHA_TECNICA: 'erp_custos_ficha_tecnica',
  RH_PONTO: 'erp_rh_ponto',
  RH_FERIAS: 'erp_rh_ferias',
  RH_HORAS_EXTRAS: 'erp_rh_horas_extras',
  // NFe Module Keys
  NOTAS_FISCAIS_ENTRADA: 'erp_notas_fiscais_entrada',
  NF_RATEIO: 'erp_nf_rateio', 
  NOTA_ITENS: 'erp_nota_itens',
  NF_DIVERGENCIA: 'erp_nf_divergencia',
  NF_AUDITORIA: 'erp_nf_auditoria',
  // CRM
  CRM_OPORTUNIDADES: 'erp_crm_oportunidades',
  // BPO
  BPO_ACESSOS: 'erp_bpo_acessos',
  BPO_CLIENTES: 'bpo_clientes', // Mapping existing keys
  BPO_FASE_B1: 'bpo_fase_b1',
  BPO_FASE_B2: 'bpo_fase_b2',
  BPO_FASE_B3: 'bpo_fase_b3',
  BPO_FASE_B4: 'bpo_fase_b4',
  BPO_FASE_B5: 'bpo_fase_b5',
};

const DEFAULT_CENTRO_CUSTOS = [
  { codigo: 'CC-01', nome: 'Direcao e Estrategia' },
  { codigo: 'CC-02', nome: 'Administrativo e Financeiro' },
  { codigo: 'CC-03', nome: 'Pessoas e Cultura' },
  { codigo: 'CC-04', nome: 'Tecnologia e Infraestrutura' },
  { codigo: 'CC-05', nome: 'Juridico e Compliance' },
  { codigo: 'CC-10', nome: 'Consultoria Financeira' },
  { codigo: 'CC-11', nome: 'Consultoria Operacional e Processos' },
  { codigo: 'CC-12', nome: 'Implantacao de Sistemas Horizon' },
  { codigo: 'CC-13', nome: 'Projetos Especializados' },
  { codigo: 'CC-14', nome: 'Sucesso do Cliente' },
  { codigo: 'CC-15', nome: 'Auditorias Internas e Diagnosticos' },
  { codigo: 'CC-20', nome: 'Comercial' },
  { codigo: 'CC-21', nome: 'Marketing Institucional' },
  { codigo: 'CC-22', nome: 'Branding e Conteudo Digital' },
  { codigo: 'CC-23', nome: 'Parcerias e Afiliados' },
  { codigo: 'CC-30', nome: 'Academy - Gestao Academica' },
  { codigo: 'CC-31', nome: 'Academy - Cursos Gravados' },
  { codigo: 'CC-32', nome: 'Academy - Mentorias e Programas ao Vivo' },
  { codigo: 'CC-33', nome: 'Academy - Comunidade e Membership' },
  { codigo: 'CC-34', nome: 'Academy - Suporte ao Aluno' },
  { codigo: 'CC-35', nome: 'Academy - Producao Audiovisual e Estudio' },
  { codigo: 'CC-36', nome: 'Academy - Marketing' },
  { codigo: 'CC-37', nome: 'Academy - Comercial' },
  { codigo: 'CC-40', nome: 'Inovacao e Desenvolvimento de Produtos' },
  { codigo: 'CC-41', nome: 'Pesquisa e Novas Tecnologias' }
];

const INITIAL_ETAPAS_F5 = [
  { 
    id: 'f1', 
    numero: '1', 
    nome: 'F1 – Diagnóstico', 
    descricao: 'Análise inicial e diagnóstico do cenário atual.', 
    template_objetivos: ['Identificar dores', 'Mapear processos atuais'],
    template_atividades: [
      { descricao: 'Reunião de Kickoff', responsavel: 'Consultor', prazo: 2 },
      { descricao: 'Entrevista com Stakeholders', responsavel: 'Consultor', prazo: 5 }
    ],
    entregaveis: [],
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'f2', 
    numero: '2', 
    nome: 'F2 – Estruturação', 
    descricao: 'Planejamento e estruturação dos processos.', 
    template_objetivos: ['Definir novos fluxos'],
    template_atividades: [],
    entregaveis: [],
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'f3', 
    numero: '3', 
    nome: 'F3 – Implementação', 
    descricao: 'Execução e implementação das melhorias.', 
    template_objetivos: [],
    template_atividades: [],
    entregaveis: [],
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'f4', 
    numero: '4', 
    nome: 'F4 – Performance', 
    descricao: 'Monitoramento e análise de performance.', 
    template_objetivos: [],
    template_atividades: [],
    entregaveis: [],
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'f5', 
    numero: '5', 
    nome: 'F5 – Treinamento', 
    descricao: 'Capacitação da equipe e treinamento final.', 
    template_objetivos: [],
    template_atividades: [],
    entregaveis: [],
    createdAt: new Date().toISOString() 
  },
];

const DEFAULT_SECURITY_CONFIG = {
    sessao_expiracao_minutos: 30,
    lista_ips_bloqueados: [],
    lista_ips_permitidos: [],
    deteccao_login_suspeito: true
};

const uuidv4 = () => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

const DEFAULT_PERMISSIONS = [
  'admin.full_access', 'reports.view', 'reports.export', 'pdf.generate', 'whatsapp.send',
  'orders.convert_quote', 'bank.reconcile', 'impersonate.user', 'settings.manage', 'sso.configure',
  'admin.invite', 'admin.manage_roles', 'admin.view_audit',
  'clients.create', 'clients.read', 'clients.update', 'clients.delete',
  'products.create', 'products.read', 'products.update', 'products.delete',
  'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
  'finance.create', 'finance.read', 'finance.update', 'finance.delete',
  'projects.create', 'projects.read', 'projects.update', 'projects.delete',
  'quotes.read', 'quotes.create', 'quotes.update',
  'orders.create',
  'purchases.create', 'purchases.update', 'purchases.receive',
  'purchases.nfe.view', 'purchases.nfe.process', 'purchases.nfe.match', 'purchases.nfe.delete',
  'accounts.ap.read', 'accounts.ap.create', 'accounts.ap.update', 'accounts.ap.delete',
  'accounts.ar.read', 'accounts.ar.create', 'accounts.ar.update', 'accounts.ar.delete',
  'bank.reconciliation',
  'reports.dre.view',
  'control.pe.read', 'control.pe.create', 'control.pe.update', 'control.pe.delete',
  'inventory.read', 'inventory.create', 'inventory.update', 'inventory.approve',
  'costs.read', 'costs.create', 'costs.update', 'costs.delete',
  'hr.create', 'hr.read', 'hr.update', 'hr.delete',
  'f5.create', 'f5.read', 'f5.update', 'f5.delete',
  'companies.create', 'companies.read', 'companies.update', 'companies.delete',
  // CRM Permissions
  'crm.read', 'crm.create', 'crm.update', 'crm.delete'
];

const DEFAULT_ROLES = [
  { name: 'Admin', desc: 'Acesso total ao sistema' },
  { name: 'Gestor Financeiro', desc: 'Gestão de contas e relatórios financeiros' },
  { name: 'Compras', desc: 'Gestão de fornecedores e pedidos de compra' },
  { name: 'Vendas', desc: 'Gestão de clientes, orçamentos e pedidos' },
  { name: 'Operacoes', desc: 'Gestão de projetos e estoque' },
  { name: 'RH', desc: 'Gestão de times e usuários básicos' },
  { name: 'Auditor', desc: 'Apenas leitura de logs e relatórios' }
];

const initSecurity = () => {
  if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
    const roles = DEFAULT_ROLES.map(r => ({ id: uuidv4(), nome: r.name, descricao: r.desc, createdAt: new Date().toISOString() }));
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
    
    const permissions = DEFAULT_PERMISSIONS.map(p => ({ 
      id: uuidv4(), 
      codigo: p, 
      nome_amigavel: p.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '), 
      escopo: p.split('.')[0],
      descricao: `Permissão para ${p}`,
      createdAt: new Date().toISOString()
    }));
    localStorage.setItem(STORAGE_KEYS.PERMISSOES, JSON.stringify(permissions));

    const adminUser = {
      id: uuidv4(),
      codigo: 'ADM001',
      nome_completo: 'Administrador do Sistema',
      email: 'admin@erppro.com',
      ativo: true,
      mfa_ativado: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify([adminUser]));

    const adminRole = roles.find(r => r.nome === 'Admin');
    if (adminRole) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify([{
        id: uuidv4(),
        user_id: adminUser.id,
        role_id: adminRole.id,
        data_atribuicao: new Date().toISOString()
      }]));
      
      const fullAccessPerm = permissions.find(p => p.codigo === 'admin.full_access');
      if(fullAccessPerm) {
        localStorage.setItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify([{
            id: uuidv4(),
            role_id: adminRole.id,
            permission_id: fullAccessPerm.id,
            tipo: 'Allow'
        }]));
      }
    }
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.SECURITY_CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.SECURITY_CONFIG, JSON.stringify(DEFAULT_SECURITY_CONFIG));
  }
};

const initCostCenters = () => {
  let currentItems = [];
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.CENTRO_CUSTOS);
    if (existing) {
      currentItems = JSON.parse(existing);
    }
  } catch (e) {
    currentItems = [];
  }

  let hasChanges = false;
  const existingCodes = new Set(currentItems.map(item => item.codigo));

  DEFAULT_CENTRO_CUSTOS.forEach(cc => {
    if (!existingCodes.has(cc.codigo)) {
      currentItems.push({
        id: uuidv4(),
        ...cc,
        responsavel: 'Não definido',
        ativo: 'Sim',
        observacoes: 'Carga inicial do sistema',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      hasChanges = true;
    }
  });

  if (hasChanges || currentItems.length === 0) {
    localStorage.setItem(STORAGE_KEYS.CENTRO_CUSTOS, JSON.stringify(currentItems));
  }
};

initSecurity();
initCostCenters();

export const storage = {
  get: (key) => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS[key]);
      if (!data) {
          if (key === 'F5_ETAPAS') {
            localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(INITIAL_ETAPAS_F5));
            return INITIAL_ETAPAS_F5;
          }
          if (key === 'SECURITY_CONFIG') {
              return DEFAULT_SECURITY_CONFIG;
          }
      }
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting data from localStorage:', error);
      return [];
    }
  },

  set: (key, data) => {
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    } catch (error) {
      console.error('Error setting data to localStorage:', error);
    }
  },

  add: (key, item) => {
    const items = storage.get(key);
    const newItem = {
      ...item,
      id: item.id || uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (key === 'SECURITY_CONFIG') {
        storage.set(key, newItem);
        return newItem;
    }

    storage.set(key, [...items, newItem]);
    
    if (key !== 'erp_admin_logs') {
        const log = {
            id: uuidv4(),
            user_id: 'system', 
            acao: 'CREATE',
            entidade: key,
            entidade_id: newItem.id,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            user_agent: navigator.userAgent
        };
        const logs = storage.get('LOGS_AUDITORIA');
        storage.set('LOGS_AUDITORIA', [log, ...logs]);
    }

    return newItem;
  },

  update: (key, id, updates) => {
    if (key === 'SECURITY_CONFIG') {
        const current = storage.get(key);
        const updated = { ...current, ...updates };
        storage.set(key, updated);
        return updated;
    }

    const items = storage.get(key);
    const oldItem = items.find(item => item.id === id);
    const updatedItems = items.map(item =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    );
    storage.set(key, updatedItems);

     if (key !== 'erp_admin_logs' && oldItem) {
        const log = {
            id: uuidv4(),
            user_id: 'system',
            acao: 'UPDATE',
            entidade: key,
            entidade_id: id,
            timestamp: new Date().toISOString()
        };
        const logs = storage.get('LOGS_AUDITORIA');
        storage.set('LOGS_AUDITORIA', [log, ...logs]);
    }

    return updatedItems.find(item => item.id === id);
  },

  delete: (key, id) => {
    const items = storage.get(key);
    const filteredItems = items.filter(item => item.id !== id);
    storage.set(key, filteredItems);

    if (key !== 'erp_admin_logs') {
        const log = {
            id: uuidv4(),
            user_id: 'system',
            acao: 'DELETE',
            entidade: key,
            entidade_id: id,
            timestamp: new Date().toISOString()
        };
        const logs = storage.get('LOGS_AUDITORIA');
        storage.set('LOGS_AUDITORIA', [log, ...logs]);
    }
  },

  getById: (key, id) => {
    const items = storage.get(key);
    return items.find(item => item.id === id);
  },
  
  uuid: uuidv4
};