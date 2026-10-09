// Módulos do sistema que podem ser ligados/desligados por empresa (empresas.modulos_ativos).
// modulos_ativos nulo = todos os módulos (empresas antigas e novas, até alguém restringir).
// Cadastros é o núcleo: fica sempre ligado.

export const MODULOS = [
  { chave: 'cadastros', nome: 'Cadastros', grupo: 'Gestão', fixo: true, prefixos: ['/cadastros'] },
  { chave: 'vendas', nome: 'Vendas', grupo: 'Gestão', prefixos: ['/vendas'] },
  { chave: 'financeiro', nome: 'Financeiro', grupo: 'Gestão', prefixos: ['/financeiro', '/movimentacao-financeira', '/importar-extrato'] },
  { chave: 'fiscal', nome: 'Fiscal', grupo: 'Gestão', prefixos: ['/fiscal'] },
  { chave: 'contabilidade', nome: 'Contabilidade', grupo: 'Gestão', prefixos: ['/contabilidade'] },
  { chave: 'rh', nome: 'Recursos Humanos', grupo: 'Gestão', prefixos: ['/rh'] },
  { chave: 'controladoria', nome: 'Controladoria', grupo: 'Gestão', prefixos: ['/controladoria'] },
  { chave: 'custos', nome: 'Custos', grupo: 'Gestão', prefixos: ['/custos'] },
  { chave: 'crm', nome: 'CRM', grupo: 'Operação', prefixos: ['/crm'] },
  { chave: 'projetos', nome: 'Projetos', grupo: 'Operação', prefixos: ['/operacao/projeto'] },
  { chave: 'consultoria_f5', nome: 'Consultoria F5', grupo: 'Operação', prefixos: ['/metodologia-f5'] },
  { chave: 'bpo_e5', nome: 'BPO E5', grupo: 'Operação', prefixos: ['/bpo', '/operacao/bpo-e5', '/clientes-bpo'] },
  { chave: 'estoque', nome: 'Estoque', grupo: 'Operação', prefixos: ['/estoque'] },
  { chave: 'compras', nome: 'Compras', grupo: 'Operação', prefixos: ['/compras'] }
];

export const CHAVES_MODULOS = MODULOS.map((m) => m.chave);

// Nome do grupo no menu lateral -> chave do módulo
export const MODULO_DO_MENU = {
  Cadastros: 'cadastros',
  Vendas: 'vendas',
  Financeiro: 'financeiro',
  Fiscal: 'fiscal',
  Contabilidade: 'contabilidade',
  'Recursos Humanos': 'rh',
  Controladoria: 'controladoria',
  Custos: 'custos',
  CRM: 'crm',
  Projetos: 'projetos',
  'Consultoria F5': 'consultoria_f5',
  'BPO E5': 'bpo_e5',
  Estoque: 'estoque',
  Compras: 'compras'
};

// Pacotes prontos para aplicar na tela de módulos
export const PACOTES = [
  { nome: 'Todos os módulos', modulos: CHAVES_MODULOS },
  { nome: 'BPO Financeiro', modulos: ['cadastros', 'financeiro', 'contabilidade', 'controladoria'] },
  { nome: 'BPO Financeiro + Fiscal + RH', modulos: ['cadastros', 'financeiro', 'fiscal', 'contabilidade', 'rh', 'controladoria', 'custos'] }
];

// Qual módulo é dono desta rota (prefixo mais específico primeiro); null = rota livre (login, dashboard, administração…)
export const moduloDaRota = (pathname) => {
  let melhor = null;
  let tamanho = 0;
  for (const m of MODULOS) {
    for (const p of m.prefixos) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && p.length > tamanho) { melhor = m.chave; tamanho = p.length; }
    }
  }
  return melhor;
};

export const nomeDoModulo = (chave) => MODULOS.find((m) => m.chave === chave)?.nome || chave;

// ativos: array de chaves ou null (= todos)
export const moduloLigado = (chave, ativos) => chave === 'cadastros' || ativos == null || ativos.includes(chave);
