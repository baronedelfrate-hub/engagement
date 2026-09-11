import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/customSupabaseClient';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { 
    LayoutDashboard, FileText, Truck, Package, ShoppingCart, Wallet, BarChart3, Settings, 
    Upload, RefreshCw, ClipboardList, Briefcase, Calculator, PieChart, Users2, 
    Database, Activity, Target, Receipt, Building2, HeartHandshake as Handshake, LogOut,
    ChevronDown, ChevronRight, UserCircle, Loader2, Trash2
} from 'lucide-react';

const SidebarMenuItem = ({ item, level = 0, openMenus, toggleMenu, onClose, location }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    const isChildActive = hasSubmenu && item.submenu.some(sub => 
        location.pathname === sub.path || location.pathname.startsWith(sub.path + "/") || 
        (sub.submenu && sub.submenu.some(deepSub => location.pathname.startsWith(deepSub.path)))
    );

    const menuKey = item.title;
    const isOpen = openMenus[menuKey];
    const effectiveActive = isActive || isChildActive;
    const paddingClass = level === 0 ? "" : (level === 1 ? "pl-8" : "pl-12");

    return (
        <div className="space-y-1">
            <Button 
                variant={effectiveActive && !hasSubmenu ? "secondary" : "ghost"} 
                className={cn(
                    "w-full justify-between hover:bg-accent/50 transition-colors",
                    effectiveActive && hasSubmenu && "bg-accent/50 text-accent-foreground font-medium",
                    paddingClass
                )}
                onClick={() => {
                    if (hasSubmenu) {
                        toggleMenu(menuKey);
                    } else if (onClose) {
                        onClose();
                    }
                }}
                asChild={!hasSubmenu}
            >
                {hasSubmenu ? (
                    <>
                        <div className="flex items-center">
                            {item.icon && <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                            {item.title}
                        </div>
                        <ChevronDown 
                            className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                            )} 
                        />
                    </>
                ) : (
                    <Link to={item.path}>
                         <div className="flex items-center">
                            {item.icon && <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                            {item.title}
                        </div>
                    </Link>
                )}
            </Button>
            
            {hasSubmenu && isOpen && (
                <div className="space-y-1 ml-0 border-l-2 border-border/50 animate-in slide-in-from-top-2 duration-200">
                    {item.submenu.map((sub, subIndex) => (
                        <SidebarMenuItem
                            key={subIndex}
                            item={sub}
                            level={level + 1}
                            openMenus={openMenus}
                            toggleMenu={toggleMenu}
                            onClose={onClose}
                            location={location}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  let user = null, profile = null, isSuperAdmin = false, role = null;
  try {
    const auth = useAuthContext();
    user = auth?.user ?? null;
    profile = auth?.profile ?? null;
    isSuperAdmin = auth?.isSuperAdmin ?? false;
    role = auth?.role ?? null;
  } catch(e) {}

  const [openMenus, setOpenMenus] = useState({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const allMenuItems = [
    {
        title: "Dashboards",
        icon: LayoutDashboard,
        path: "/dashboards",
        submenu: [
            { title: "Financeiro", path: "/dashboards/financeiro" },
            { title: "Vendas", path: "/dashboards/vendas" },
            { title: "Operação", path: "/dashboards/operacao" },
            { title: "Controladoria", path: "/dashboards/controladoria" },
        ]
    },
    {
        title: "CRM",
        icon: Handshake,
        path: "/crm",
        submenu: [
            { title: "Dashboard", path: "/crm/dashboard" },
            { title: "Clientes", path: "/crm/clientes" },
            { title: "Kanban", path: "/crm/kanban" },
            { title: "Propostas", path: "/crm/propostas" },
        ]
    },
    {
        title: "Metodologia F5",
        icon: Target,
        path: "/metodologia-f5",
        submenu: [
            { title: "Dashboard Global", path: "/metodologia-f5/dashboard" },
            { title: "Projetos F5", path: "/metodologia-f5/projetos" },
            { title: "Etapas", path: "/metodologia-f5/etapas" },
            { title: "Checklists", path: "/metodologia-f5/checklists" },
            { title: "Entregáveis", path: "/metodologia-f5/entregaveis" },
            { title: "KPIs", path: "/metodologia-f5/kpis" },
            { title: "Diagnóstico F1", path: "/metodologia-f5/diagnostico-f1" },
            { title: "Central de Relatórios", path: "/metodologia-f5/relatorios" },
            { title: "Log de Auditoria", path: "/metodologia-f5/auditoria" },
        ]
    },
    {
        title: "Cadastros",
        icon: FileText,
        path: "/cadastros",
        submenu: [
            { title: "Empresas", path: "/cadastros/empresas", icon: Building2 },
            { title: "Clientes", path: "/cadastros/clientes" },
            { title: "Fornecedores", path: "/cadastros/fornecedores" },
            { title: "Produtos", path: "/cadastros/produtos" },
            { title: "Serviços", path: "/cadastros/servicos" },
            { title: "Bancos", path: "/cadastros/bancos" },
            { title: "Centro de Custos", path: "/cadastros/centro-custos" },
            { title: "Categorias", path: "/cadastros/categorias" },
            { title: "Subcategorias", path: "/cadastros/subcategorias" },
            { title: "Tipos de Pagamento", path: "/cadastros/tipo-pagamento" },
            { title: "Condições de Pagamento", path: "/cadastros/condicao-pagamento" },
            { title: "Tipos de Documento", path: "/cadastros/tipo-documento" },
            { title: "Unidades de Medida", path: "/cadastros/unidades-medida" },
            { title: "Origem", path: "/cadastros/origem" },
            { title: "Tributos", path: "/cadastros/tributos" },
        ]
    },
    {
        title: "Vendas",
        icon: ShoppingCart,
        path: "/vendas",
        submenu: [
            { title: "Orçamentos", path: "/vendas/orcamentos" },
            { title: "Pedidos", path: "/vendas/pedidos" },
            { title: "Relatórios", path: "/vendas/relatorios" },
        ]
    },
    {
        title: "Compras",
        icon: Truck,
        path: "/compras",
        submenu: [
            { title: "Pedidos de Compra", path: "/compras/pedidos" },
            { title: "Entrada de Notas", path: "/compras/notas-fiscais", icon: Receipt },
            { title: "Relatórios", path: "/compras/relatorios" },
        ]
    },
    {
        title: "Estoque",
        icon: Package,
        path: "/estoque",
        submenu: [
            { title: "Movimentações", path: "/estoque/movimentacao" },
            { title: "Inventário", path: "/estoque/inventario" },
            { title: "Entradas", path: "/estoque/entrada" },
            { title: "Transferências", path: "/estoque/transferencias" },
        ]
    },
    {
        title: "Financeiro",
        icon: Wallet,
        path: "/financeiro",
        submenu: [
            { title: "Contas a Pagar", path: "/financeiro/contas-pagar" },
            { title: "Contas a Receber", path: "/financeiro/contas-receber" },
            { title: "Movimentações Financeiras", path: "/financeiro/movimentacoes" },
            { title: "Importar Extrato", path: "/financeiro/importar-extrato", icon: Upload },
            { title: "Conciliação Bancária", path: "/financeiro/conciliacao-bancaria", icon: RefreshCw },
            { title: "Fluxo de Caixa", path: "/financeiro/fluxo-caixa", icon: BarChart3 },
            { title: "Histórico de Conciliações", path: "/financeiro/historico-conciliacoes", icon: ClipboardList },
            { title: "Baixas", path: "/financeiro/baixas", icon: Receipt },
            { title: "Relatórios", path: "/financeiro/relatorios" },
        ]
    },
    {
        title: "Fiscal", 
        path: "/fiscal",
        icon: FileText,
        submenu: [
            { title: "Dashboard Fiscal", path: "/fiscal/dashboard", icon: BarChart3 },
            { title: "NF-e (Produtos)", path: "/fiscal/nfe", icon: FileText },
            { title: "NFS-e (Serviços)", path: "/fiscal/nfse", icon: FileText },
            { title: "Manifestação de NF", path: "/fiscal/manifestacao", icon: ClipboardList },
            { title: "Entrada de NF", path: "/fiscal/entrada-nf", icon: Upload },
            { title: "Apuração de Impostos", path: "/fiscal/apuracao-impostos", icon: Calculator },
            { title: "Parâmetros Fiscais", path: "/fiscal/parametros-fiscais", icon: Settings },
        ]
    },
    {
        title: "Controladoria",
        icon: PieChart,
        path: "/controladoria",
        submenu: [
            { title: "DRE", path: "/controladoria/dre" },
            { title: "Linhas DRE", path: "/controladoria/dre-linhas" },
            { title: "Indicadores KPI", path: "/controladoria/indicadores-kpi" },
            { title: "Ponto de Equilíbrio", path: "/controladoria/ponto-equilibrio" },
        ]
    },
    {
        title: "Custos",
        icon: Calculator,
        path: "/custos",
        submenu: [
            { title: "Fichas de Custo", path: "/custos/fichas-custo" },
            { title: "Fichas de Custo Itens", path: "/custos/fichas-custo-itens" },
            { title: "Ficha Técnica", path: "/custos/ficha-tecnica" },
        ]
    },
    {
        title: "Recursos Humanos",
        icon: Users2,
        path: "/rh",
        submenu: [
            { title: "Dashboard RH", path: "/rh/dashboard" },
            { title: "Funcionários", path: "/rh/funcionarios" },
            { title: "Ponto", path: "/rh/ponto" },
            { title: "Férias", path: "/rh/ferias" },
            { title: "Folha de Pagamento", path: "/rh/folha-pagamento" },
        ]
    },
    {
        title: "Operação",
        icon: Briefcase,
        path: "/operacao",
        submenu: [
            { title: "Projetos", path: "/operacao/projeto" },
            { title: "Kanban", path: "/operacao/projeto/kanban" },
            { title: "Relatórios", path: "/operacao/projeto/relatorios" },
        ]
    },
    {
        title: "Administração",
        icon: Settings,
        path: "/admin",
        adminOnly: true,
        submenu: [
            { title: "Dashboard", path: "/admin/dashboard" },
            { title: "Usuários", path: "/admin/usuarios" },
            { title: "Times", path: "/admin/times" },
            { title: "Logs de Auditoria", path: "/admin/logs" },
            { title: "Supabase Setup", path: "/admin/supabase-setup", icon: Database },
            { title: "Limpar Dados de Teste", path: "/admin/limpar-dados", icon: Trash2 },
        ]
    }
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || (isSuperAdmin || role === 'admin'));

  useEffect(() => {
    const activePath = location.pathname;
    const newOpenMenus = { ...openMenus };
    let changed = false;

    const findAndOpen = (items) => {
        items.forEach(item => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const matches = activePath === item.path || activePath.startsWith(item.path + "/");
            const childMatches = hasSubmenu && item.submenu.some(sub => 
                activePath === sub.path || activePath.startsWith(sub.path + "/") ||
                (sub.submenu && sub.submenu.some(deepSub => activePath.startsWith(deepSub.path)))
            );

            if (matches || childMatches) {
                if (!newOpenMenus[item.title]) {
                    newOpenMenus[item.title] = true;
                    changed = true;
                }
                if (hasSubmenu) {
                    findAndOpen(item.submenu);
                }
            }
        });
    };

    findAndOpen(menuItems);

    if (changed) {
        setOpenMenus(newOpenMenus);
    }
  }, [location.pathname, isSuperAdmin, role]);

  const toggleMenu = (title) => {
    setOpenMenus(prev => ({
        ...prev,
        [title]: !prev[title]
    }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    } catch (error) {
      toast({ 
        title: "Erro ao sair", 
        description: error.message || "Ocorreu um problema ao tentar sair.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border overflow-hidden">
      {/* 1. HEADER (Fixed at top) */}
      <header className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            H
          </div>
          <span className="font-bold text-xl tracking-tight truncate text-foreground">Horizons ERP</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden shrink-0 h-8 w-8">
            <ChevronRight className="h-4 w-4" />
        </Button>
      </header>

      {/* 2. MENU CONTENT (Scrollable, takes all available middle space) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar bg-card/50">
        <div className="space-y-1">
            <Button 
                variant={location.pathname === "/" ? "secondary" : "ghost"} 
                className="w-full justify-start mb-2 font-medium"
                asChild
            >
                <Link to="/" onClick={onClose}>
                    <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                    Dashboard Geral
                </Link>
            </Button>

            {menuItems.map((item, index) => (
                <SidebarMenuItem 
                    key={index} 
                    item={item} 
                    level={0}
                    openMenus={openMenus} 
                    toggleMenu={toggleMenu}
                    onClose={onClose}
                    location={location}
                />
            ))}
        </div>
      </nav>

      {/* 3. FOOTER (Fixed at bottom) */}
      <footer className="mt-auto p-4 bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-3">
            {/* User Profile Info */}
            <div className="flex items-center gap-3 px-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {profile?.nome ? getInitials(profile.nome) : <UserCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground leading-tight">
                        {profile?.nome || 'Usuário'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">
                        {user?.email}
                    </p>
                </div>
                {(isSuperAdmin || role === 'admin') && (
                  <span className="shrink-0 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">ADM</span>
                )}
            </div>
            
            <Separator className="bg-border/60" />

            {/* Logout Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="hidden md:flex justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors w-full"
                        >
                            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-red-600 text-white border-none">
                        <p>Sair do sistema</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex md:hidden justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors w-full"
            >
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
            </Button>
        </div>
      </footer>
    </div>
  );
};

export default Sidebar;