import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Users, 
  DollarSign, 
  BookOpen, 
  BarChart3,
  Landmark,
  FolderOpen,
  Target,
  UserCheck,
  CreditCard,
  Building,
  MapPin,
  Package,
  Wrench,
  Layers,
  FileText,
  Banknote,
  Box,
  Scale,
  Ruler,
  Receipt,
  TrendingUp,
  ArrowDownUp,
  Wallet,
  GitMerge,
  Phone,
  Download,
  BarChart2,
  BookMarked,
  PenTool,
  FolderClosed,
  Calendar,
  AlertCircle,
  PieChart,
  Activity,
  ListChecks,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const DynamicClientMenu = ({ isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  // Fetch BPO clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clientes_bpo')
          .select('*')
          .eq('status', 'ativo')
          .order('nome', { ascending: true });

        if (error) throw error;

        setClients(data || []);

        // Auto-expand client if we're on a client page
        const pathParts = location.pathname.split('/');
        if (pathParts[1] === 'cliente' && pathParts[2]) {
          const clienteId = pathParts[2];
          setExpandedClients(prev => ({ ...prev, [clienteId]: true }));

          // Auto-expand section if present
          if (pathParts[3]) {
            const section = pathParts[3];
            setExpandedSections(prev => ({ ...prev, [`${clienteId}_${section}`]: true }));
          }
        }
      } catch (error) {
        console.error('Error fetching BPO clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [location.pathname]);

  const toggleClient = (clienteId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clienteId]: !prev[clienteId]
    }));
  };

  const toggleSection = (clienteId, section) => {
    const key = `${clienteId}_${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Complete menu structure for each client
  const menuStructure = [
    {
      label: 'Cadastro',
      section: 'cadastros',
      icon: Users,
      items: [
        { label: 'Bancos', path: 'bancos', icon: Landmark },
        { label: 'Categorias', path: 'categorias', icon: FolderOpen },
        { label: 'Centro de Custos', path: 'centros-custo', icon: Target },
        { label: 'Clientes', path: 'clientes', icon: UserCheck },
        { label: 'Condição de Pagamento', path: 'condicoes-pagamento', icon: CreditCard },
        { label: 'Empresas', path: 'empresas', icon: Building },
        { label: 'Fornecedores', path: 'fornecedores', icon: Users },
        { label: 'Origem', path: 'origem', icon: MapPin },
        { label: 'Produtos', path: 'produtos', icon: Package },
        { label: 'Serviços', path: 'servicos', icon: Wrench },
        { label: 'Subcategorias', path: 'subcategorias', icon: Layers },
        { label: 'Tipo de Documento', path: 'tipos-documento', icon: FileText },
        { label: 'Tipo de Pagamento', path: 'tipos-pagamento', icon: Banknote },
        { label: 'Tipo de Produto', path: 'tipo-produto', icon: Box },
        { label: 'Tributos', path: 'tributos', icon: Scale },
        { label: 'Unidades de Medida', path: 'unidades-medida', icon: Ruler }
      ]
    },
    {
      label: 'Financeiro',
      section: 'financeiro',
      icon: DollarSign,
      items: [
        { label: 'Contas a Pagar', path: 'contas-pagar', icon: Receipt },
        { label: 'Contas a Receber', path: 'contas-receber', icon: TrendingUp },
        { label: 'Movimentações Financeiras', path: 'movimentacoes', icon: ArrowDownUp },
        { label: 'Fluxo de Caixa', path: 'fluxo-caixa', icon: Wallet },
        { label: 'Conciliação Bancária', path: 'conciliacao', icon: GitMerge },
        { label: 'Cobrança', path: 'cobranca', icon: Phone },
        { label: 'Baixas', path: 'baixas', icon: Download },
        { label: 'Relatórios Financeiros', path: 'relatorios', icon: BarChart2 }
      ]
    },
    {
      label: 'Contabilidade',
      section: 'contabilidade',
      icon: BookOpen,
      items: [
        { label: 'Plano de Contas', path: 'plano-contas', icon: BookMarked },
        { label: 'Lançamentos Contábeis', path: 'lancamentos', icon: PenTool },
        { label: 'Documentos Contábeis', path: 'documentos', icon: FolderClosed },
        { label: 'Fechamento Mensal', path: 'fechamento', icon: Calendar },
        { label: 'Pendências Contábeis', path: 'pendencias', icon: AlertCircle },
        { label: 'DRE/Balancete', path: 'dre-balancete', icon: PieChart }
      ]
    },
    {
      label: 'Controladoria',
      section: 'controladoria',
      icon: BarChart3,
      items: [
        { label: 'DRE', path: 'dre', icon: Activity },
        { label: 'Ponto de Equilíbrio', path: 'ponto-equilibrio', icon: TrendingDown },
        { label: 'Indicadores KPI', path: 'indicadores-kpi', icon: BarChart2 },
        { label: 'Linhas DRE', path: 'dre-linhas', icon: ListChecks }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="px-4 py-2">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-xs text-muted-foreground">Nenhum cliente BPO cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {clients.map((client) => {
        const isClientExpanded = expandedClients[client.id];
        const isClientActive = location.pathname.includes(`/cliente/${client.id}`);

        return (
          <div key={client.id}>
            {/* Client Header */}
            <button
              onClick={() => toggleClient(client.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isClientActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="truncate"
                  >
                    {client.nome}
                  </motion.span>
                )}
              </div>
              {isSidebarOpen && (
                <motion.div
                  initial={false}
                  animate={{ rotate: isClientExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              )}
            </button>

            {/* Client Sections */}
            <AnimatePresence>
              {isSidebarOpen && isClientExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mt-1 space-y-1 ml-4 border-l-2 border-blue-200 dark:border-blue-800"
                >
                  {/* Dashboard Link */}
                  <button
                    onClick={() => navigate(`/cliente/${client.id}/dashboard`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ml-2',
                      location.pathname === `/cliente/${client.id}/dashboard`
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    Dashboard
                  </button>

                  {/* Sections */}
                  {menuStructure.map((section) => {
                    const sectionKey = `${client.id}_${section.section}`;
                    const isSectionExpanded = expandedSections[sectionKey];
                    const isSectionActive = location.pathname.includes(`/cliente/${client.id}/${section.section}`);

                    return (
                      <div key={section.section}>
                        <button
                          onClick={() => toggleSection(client.id, section.section)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ml-2',
                            isSectionActive ? 'text-foreground bg-muted' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <section.icon className="h-4 w-4" />
                            {section.label}
                          </div>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              isSectionExpanded && 'rotate-180'
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {isSectionExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1 ml-6"
                            >
                              {section.items.map((item) => {
                                const itemPath = `/cliente/${client.id}/${section.section}/${item.path}`;
                                const isItemActive = location.pathname === itemPath;
                                const ItemIcon = item.icon;

                                return (
                                  <button
                                    key={item.path}
                                    onClick={() => navigate(itemPath)}
                                    className={cn(
                                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                      isItemActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                  >
                                    <ItemIcon className="h-4 w-4" />
                                    {item.label}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default DynamicClientMenu;