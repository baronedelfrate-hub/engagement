import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, TrendingUp, DollarSign, Package, Briefcase, Users, Settings, 
  BarChart2, ChevronRight, ShoppingCart, Percent, Scale, 
  HeartHandshake as Handshake, Building2, FolderCog, Activity, 
  ClipboardList, FileText, Heart, BookOpen, GitFork, Phone, BarChart3, Clock,
  BookMarked, CalendarCheck, FolderOpen, Edit3, FileSpreadsheet, Sliders, Server,
  LogOut, ArrowRightLeft, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EngagementLogo from '@/components/EngagementLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import DynamicClientMenu from '@/components/DynamicClientMenu';
import Header from '@/components/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// Define the navigation structure
const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    name: 'GESTÃO',
    icon: FolderCog,
    children: [
      {
        name: 'Cadastros',
        icon: Users,
        isNested: true,
        children: [
          { name: 'Bancos', href: '/cadastros/bancos' },
          { name: 'Categorias', href: '/cadastros/categorias' },
          { name: 'Centro de Custos', href: '/cadastros/centro-custos' },
          { name: 'Clientes', href: '/cadastros/clientes' },
          { name: 'Condição de Pagamento', href: '/cadastros/condicao-pagamento' },
          { name: 'Empresas', href: '/cadastros/empresas' },
          { name: 'Fornecedores', href: '/cadastros/fornecedores' },
          { name: 'Produtos', href: '/cadastros/produtos' },
          { name: 'Serviços', href: '/cadastros/servicos' },
          { name: 'Subcategorias', href: '/cadastros/subcategorias' },
          { name: 'Tipo de Produto', href: '/cadastros/tipo-produto' },
        ],
      },
      {
        name: 'Vendas',
        icon: TrendingUp,
        isNested: true,
        children: [
          { name: 'Orçamentos', href: '/vendas/orcamentos' },
          { name: 'Pedidos de Venda', href: '/vendas/pedidos' },
          { name: 'Relatórios', href: '/vendas/relatorios' },
        ],
      },
      {
        name: 'Financeiro',
        icon: DollarSign,
        isNested: true,
        children: [
          { name: 'Movimentação Financeira', href: '/movimentacao-financeira', icon: ArrowRightLeft },
          { name: 'Conciliação Bancária', href: '/financeiro/conciliacao-bancaria' },
          { name: 'Importar Extrato', href: '/financeiro/importar-extrato' },
          { name: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa' },
          { name: 'Histórico Conciliações', href: '/financeiro/historico-conciliacoes' },
          { name: 'Relatórios', href: '/financeiro/relatorios' },
          { name: 'Cobrança', href: '/financeiro/cobranca', icon: Phone },
          { name: 'Dashboard de Cobrança', href: '/financeiro/cobranca/dashboard', icon: BarChart3 },
        ],
      },
      { 
        name: 'Fiscal',
        icon: FileText,
        isNested: true,
        children: [
          { name: 'Dashboard Fiscal', href: '/fiscal/dashboard' },
          { name: 'Pedidos de Venda', href: '/fiscal/pedidos-venda' },
          { name: 'NF-e (Produtos)', href: '/fiscal/nfe-produtos' },
          { name: 'NFS-e (Serviços)', href: '/fiscal/nfse-servicos' },
          { name: 'Entrada de NF', href: '/fiscal/entrada-nf' },
          { name: 'Manifestação de NF', href: '/fiscal/manifestacao-nf' },
          { name: 'Apuração de Impostos', href: '/fiscal/apuracao-impostos' },
          { name: 'Parâmetros Fiscais', href: '/fiscal/parametros-fiscais' },
        ]
      },
      {
        name: 'Contabilidade',
        icon: BookMarked,
        isNested: true,
        children: [
          { name: 'Dashboard Contábil', href: '/contabilidade/dashboard' },
          { name: 'Fechamento Mensal', href: '/contabilidade/fechamento', icon: CalendarCheck },
          { name: 'Documentos para Contab.', href: '/contabilidade/documentos', icon: FolderOpen },
          { name: 'Lançamentos Contábeis', href: '/contabilidade/lancamentos', icon: Edit3 },
          { name: 'Pendências', href: '/contabilidade/pendencias' },
          { name: 'Conciliações', href: '/contabilidade/conciliacoes', icon: GitFork },
          { name: 'DRE/Balancete', href: '/contabilidade/dre-balancete' },
          { name: 'Parâmetros Contábeis', href: '/contabilidade/parametros', icon: Sliders },
        ],
      },
      {
        name: 'Recursos Humanos',
        icon: Users,
        isNested: true,
        children: [
          { name: 'Dashboard RH', href: '/rh' },
          { name: 'Cadastro de Funcionários', href: '/rh/funcionarios' },
          { name: 'Controle de Ponto', href: '/rh/controle-ponto' },
          { name: 'Folha de Pagamento', href: '/rh/folha-pagamento' },
          { name: 'Benefícios', href: '/rh/beneficios' },
          { name: 'Medicina Ocupacional', href: '/rh/medicina-ocupacional' },
          { name: 'Análise de Desempenho', href: '/rh/desempenho' },
          { name: 'Políticas e Manuais', href: '/rh/descricao-cargos' },
          { name: 'Descrição de Cargos', href: '/rh/descricao-cargos' },
          { name: 'Organogramas', href: '/rh/organogramas' },
        ]
      },
      {
        name: 'Controladoria',
        icon: Scale,
        isNested: true,
        children: [
          { name: 'DRE', href: '/controladoria/dre' },
          { name: 'Ponto de Equilíbrio', href: '/controladoria/ponto-equilibrio' },
        ],
      },
      {
        name: 'Custos',
        icon: Percent,
        isNested: true,
        children: [
          { name: 'Ficha Técnica', href: '/custos/ficha-tecnica' },
        ],
      },
      {
        name: 'Administração',
        icon: Settings,
        isNested: true,
        children: [
          { name: 'Central de Config.', href: '/admin', icon: Server },
          { name: 'Dashboard', href: '/admin/dashboard' },
          { name: 'Usuários', href: '/admin/usuarios' },
          { name: 'Cargos', href: '/admin/roles' },
          { name: 'Permissões', href: '/admin/permissoes' },
          { name: 'Config. Segurança', href: '/admin/seguranca' },
          { name: 'Times', href: '/admin/times' },
          { name: 'Logs de Auditoria', href: '/admin/logs' },
          { name: 'Sessões Ativas', href: '/admin/sessoes' },
          { name: 'Temas', href: '/configuracoes/temas' },
        ],
      },
    ],
  },
  {
    name: 'OPERAÇÃO',
    icon: Activity,
    children: [
      {
        name: 'CRM',
        icon: Handshake, 
        isNested: true,
        children: [
          { name: 'Dashboard', href: '/crm/dashboard' },
          { name: 'Clientes', href: '/crm/clientes' },
          { name: 'Kanban', href: '/crm/kanban' },
          { name: 'Propostas', href: '/crm/propostas' },
        ],
      },
      {
        name: 'Projetos',
        icon: Briefcase,
        isNested: true,
        children: [
          { name: 'Lista de Projetos', href: '/operacao/projeto' },
          { name: 'Kanban', href: '/operacao/projeto/kanban' },
          { name: 'Relatórios', href: '/operacao/projeto/relatorios' },
        ],
      },
      {
        name: 'Consultoria F5', 
        icon: BarChart2,
        isNested: true,
        children: [
          { name: 'Dashboard Global', href: '/metodologia-f5/dashboard' },
          { name: 'Diagnóstico F1', href: '/metodologia-f5/diagnostico-f1' },
          { name: 'Histórico F1', href: '/metodologia-f5/historico' },
          { name: 'Projetos F5', href: '/metodologia-f5/projetos' },
          { name: 'Relatórios F5', href: '/metodologia-f5/relatorios' },
          { name: 'Permissões', href: '/metodologia-f5/permissoes' },
          { name: 'Logs de Auditoria', href: '/metodologia-f5/auditoria' },
        ],
      },
      {
        name: 'BPO E5', 
        icon: ClipboardList,
        isNested: true,
        children: [
          { name: 'Dashboard', href: '/bpo/dashboard' },
          { name: 'Clientes BPO', href: '/bpo/clientes' },
        ],
      },
      {
        name: 'Estoque',
        icon: Package,
        isNested: true,
        children: [
          { name: 'Entrada de Estoque', href: '/estoque/entrada' },
          { name: 'Movimentação de Estoque', href: '/estoque/movimentacao' },
          { name: 'Inventário', href: '/estoque/inventario' },
          { name: 'Reservas', href: '/estoque/reservas' },
          { name: 'Transferências', href: '/estoque/transferencias' },
        ],
      },
      {
        name: 'Compras',
        icon: ShoppingCart,
        isNested: true,
        children: [
          { name: 'Pedidos de Compra', href: '/compras/pedidos' },
          { name: 'Entrada de Notas Fiscais', href: '/compras/notas-fiscais' },
          { name: 'Relatórios', href: '/compras/relatorios' },
        ],
      },
    ],
  }
];

// Recursive component to render menu items (including nested children)
const MenuItem = ({ item, isSidebarOpen, openMenus, toggleMenu, level = 0 }) => {
  const location = useLocation();

  // Check if this item or any of its children are active
  const isActive = item.href && location.pathname === item.href;
  const hasActiveChild = item.children?.some(child => {
    if (child.href) return location.pathname.startsWith(child.href);
    if (child.children) {
      return child.children.some(subChild => {
         if (subChild.href && location.pathname.startsWith(subChild.href)) return true;
         // Check one more level deep
         if (subChild.children) {
            return subChild.children.some(deepChild => deepChild.href && location.pathname.startsWith(deepChild.href));
         }
         return false;
      });
    }
    return false;
  });

  const isTopLevelGroup = level === 0 && item.children;

  if (!item.children || item.children.length === 0) {
    // Leaf node - render link
    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-sidebar-active text-sidebar-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
          )
        }
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        {item.icon && <item.icon className="h-5 w-5" />}
        {!item.icon && level > 0 && <span className="h-2 w-2 rounded-full bg-current" />}
        {item.name}
      </NavLink>
    );
  }

  // Top-level section header (GESTÃO / OPERAÇÃO) — subtle uppercase label
  if (isTopLevelGroup) {
    return (
      <div>
        <button
          onClick={() => toggleMenu(item.name)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 mt-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
            openMenus[item.name] || hasActiveChild
              ? 'text-sidebar-foreground/90'
              : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
          )}
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon className="h-4 w-4" />}
            {isSidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                {item.name}
              </motion.span>
            )}
          </div>
          {isSidebarOpen && (
            <motion.div
              initial={false}
              animate={{ rotate: openMenus[item.name] ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </button>
        <AnimatePresence>
          {isSidebarOpen && openMenus[item.name] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-1 space-y-1"
            >
              {item.children.map((child) => (
                <MenuItem
                  key={child.name}
                  item={child}
                  isSidebarOpen={isSidebarOpen}
                  openMenus={openMenus}
                  toggleMenu={toggleMenu}
                  level={level + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Parent node - render collapsible section
  return (
    <div>
      <button
        onClick={() => toggleMenu(item.name)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
          openMenus[item.name] || hasActiveChild
            ? 'text-sidebar-foreground bg-sidebar-hover'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
        )}
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        <div className="flex items-center gap-3">
          {item.icon && <item.icon className="h-5 w-5" />}
          {!item.icon && level > 0 && <span className="h-2 w-2 rounded-full bg-current" />}
          {isSidebarOpen && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {item.name}
            </motion.span>
          )}
        </div>
        {isSidebarOpen && (
          <motion.div
            initial={false}
            animate={{ rotate: openMenus[item.name] ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        )}
      </button>
      <AnimatePresence>
        {isSidebarOpen && openMenus[item.name] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-1 space-y-1"
          >
            {item.children.map((child) => (
              <MenuItem
                key={child.name}
                item={child}
                isSidebarOpen={isSidebarOpen}
                openMenus={openMenus}
                toggleMenu={toggleMenu}
                level={level + 1}
              />
            ))}
            
            {/* Add dynamic client menus after static children if this is CLIENTES BPO section */}
            {item.hasDynamicContent && (
              <div className="mt-2">
                <DynamicClientMenu isSidebarOpen={isSidebarOpen} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Flatten navigation to find the current section name for the header breadcrumb
const flattenNavigation = (items, acc = []) => {
  items.forEach((item) => {
    if (item.href) acc.push({ name: item.name, href: item.href });
    if (item.children) flattenNavigation(item.children, acc);
  });
  return acc;
};
const flatNavigation = flattenNavigation(navigation);

const Layout = ({ children }) => {
  let isSuperAdmin = false;
  let profileName = null;
  try {
    const auth = useAuthContext();
    isSuperAdmin = auth?.isSuperAdmin ?? false;
    profileName = auth?.profile?.nome || auth?.user?.email || null;
  } catch (e) {}

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const currentPage = useMemo(() => {
    const matches = flatNavigation.filter(
      (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
    );
    if (matches.length === 0) return 'Dashboard';
    return matches.sort((a, b) => b.href.length - a.href.length)[0].name;
  }, [location.pathname]);

  // Open parent menu if child is active
  useEffect(() => {
    const newOpenMenus = {};
    
    const checkAndOpenMenu = (items, parentName = null) => {
      items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => {
            if (child.href && location.pathname.startsWith(child.href)) return true;
            if (child.children) {
              return child.children.some(subChild => {
                if (subChild.href && location.pathname.startsWith(subChild.href)) return true;
                if (subChild.children) {
                    return subChild.children.some(deepChild => deepChild.href && location.pathname.startsWith(deepChild.href));
                }
                return false;
              });
            }
            return false;
          });
          
          if (hasActiveChild) {
            newOpenMenus[item.name] = true;
            if (parentName) {
              newOpenMenus[parentName] = true;
            }
          }
          
          // Recursively check nested children
          if (item.children.some(c => c.children)) {
            checkAndOpenMenu(item.children, item.name);
          }
        }
        
        // Also check if we're on a dynamic client page
        if (item.hasDynamicContent && location.pathname.includes('/cliente/')) {
          newOpenMenus[item.name] = true;
          if (parentName) {
            newOpenMenus[parentName] = true;
          }
        }
      });
    };
    
    checkAndOpenMenu(navigation);
    setOpenMenus(newOpenMenus);
  }, [location.pathname]);

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? '280px' : '80px' }}
        transition={{ duration: 0.3 }}
        className="fixed inset-y-0 left-0 z-50 bg-sidebar shadow-xl overflow-hidden flex flex-col h-screen"
      >
        <div className="p-4 flex items-center justify-center border-b border-white/10 h-16 shrink-0">
          {isSidebarOpen ? (
            <div className="bg-white/95 rounded-lg px-3 py-2 w-full flex items-center justify-center">
              <EngagementLogo height={32} className="w-full max-w-[160px]" />
            </div>
          ) : (
            <div className="bg-white/95 rounded-lg p-1.5">
              <EngagementLogo height={28} className="w-auto h-auto max-w-[28px]" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto sidebar-scrollbar pt-4">
          <nav className="flex flex-col space-y-1 px-3">
            {navigation
              .map(item => {
                if (item.name === 'GESTÃO') {
                  return {
                    ...item,
                    children: item.children?.filter(child =>
                      child.name !== 'Administração' || isSuperAdmin
                    )
                  };
                }
                return item;
              })
              .map((item) => (
              <div key={item.name}>
                {!item.children || item.children.length === 0 ? (
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-active text-sidebar-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {isSidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>{item.name}</motion.span>}
                  </NavLink>
                ) : (
                  <MenuItem
                    item={item}
                    isSidebarOpen={isSidebarOpen}
                    openMenus={openMenus}
                    toggleMenu={toggleMenu}
                    level={0}
                  />
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 mt-auto shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-red-300 hover:bg-white/10 hover:text-red-200 transition-colors text-sm font-medium mb-1"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isSidebarOpen && <span>Sair</span>}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center w-full h-10 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            {isSidebarOpen && <span className="ml-2 text-sm">Recolher Sidebar</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: isSidebarOpen ? '280px' : '80px' }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Header onLogout={handleLogout} userName={profileName}>
          <div>
            <p className="text-xs text-muted-foreground leading-none mb-1">Engagement Soluções</p>
            <h1 className="text-lg font-semibold text-foreground leading-none">{currentPage}</h1>
          </div>
        </Header>

        <ScrollArea className="flex-1 p-6 overflow-auto custom-scrollbar">
          {children}
        </ScrollArea>
      </motion.main>
    </div>
  );
};

export default Layout;