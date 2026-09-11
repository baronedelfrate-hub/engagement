import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { F5Provider } from '@/contexts/F5Context'; 
import { CRMProvider } from '@/contexts/CRMContext'; 
import { ContabilidadeProvider } from '@/contexts/ContabilidadeContext';
import { SessionValidator } from '@/components/SessionValidator';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Callback from '@/pages/auth/Callback';
import SetPassword from '@/pages/auth/SetPassword';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SuperAdminRoute } from '@/components/SuperAdminRoute';
import { initializeF5Data } from '@/lib/f5_data_seed';
import { initializeBPOData } from '@/lib/bpo_data_seed';
import { Toaster } from '@/components/ui/toaster';

import '@/lib/testClientesQuery';
import '@/lib/testExtratoImport';

import DashboardAdmin from '@/pages/admin/DashboardAdmin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UsuariosPage from '@/pages/admin/usuarios/UsuariosPage';
import RolesList from '@/pages/admin/roles/RolesList';
import RolesForm from '@/pages/admin/roles/RolesForm';
import PermissoesList from '@/pages/admin/permissoes/PermissoesList';
import PermissoesForm from '@/pages/admin/permissoes/PermissoesForm';
import TimesList from '@/pages/admin/times/TimesList';
import TimesForm from '@/pages/admin/times/TimesForm';
import LogsAuditoria from '@/pages/admin/auditoria/LogsAuditoria';
import SessoesAtivas from '@/pages/admin/sessoes/SessoesAtivas';
import ConfiguracoesSeguracaForm from '@/pages/admin/seguranca/ConfiguracoesSeguracaForm';
import SettingsTema from '@/pages/admin/SettingsTema';
import SupabaseSetup from '@/pages/admin/SupabaseSetup';
import DatabaseTest from '@/pages/admin/DatabaseTest';
import SchemaInitializer from '@/pages/admin/SchemaInitializer';
import PropostasMigration from '@/pages/admin/PropostasMigration';
import MunicipiosMigration from '@/pages/admin/MunicipiosMigration';
import FiscalMunicipiosMigration from '@/pages/admin/FiscalMunicipiosMigration';
import FiscalMunicipiosSetup from '@/pages/admin/FiscalMunicipiosSetup';
import LimparDados from '@/pages/admin/LimparDados';

import CobrancaKanbanIntegrated from '@/pages/financeiro/cobranca/CobrancaKanbanIntegrated';
import CobrancaDashboardIntegrated from '@/pages/financeiro/cobranca/CobrancaDashboardIntegrated';
import ContasPagarList from '@/pages/financeiro/ContasPagarList';
import ContasPagarForm from '@/pages/financeiro/ContasPagarForm';
import ContasReceberList from '@/pages/financeiro/ContasReceberList';
import ContasReceberForm from '@/pages/financeiro/ContasReceberForm';
import MovimentacaoFinanceiraPage from '@/pages/financeiro/MovimentacaoFinanceiraPage';
import NovaMovimentacaoPage from '@/pages/financeiro/NovaMovimentacaoPage';
import MovimentacoesFinanceirasList from '@/pages/financeiro/MovimentacoesFinanceirasList';
import MovimentacoesFinanceirasForm from '@/pages/financeiro/MovimentacoesFinanceirasForm';
import ImportarExtratoPage from '@/pages/financeiro/ImportarExtratoPage';
import ConciliacaoBancariaPage from '@/pages/financeiro/ConciliacaoBancariaPage';
import FluxoCaixaDashboard from '@/pages/financeiro/fluxocaixa/FluxoCaixaDashboard';
import FluxoCaixaMovimentacoesList from '@/pages/financeiro/fluxocaixa/FluxoCaixaMovimentacoesList';
import FluxoCaixaMovimentacoesForm from '@/pages/financeiro/fluxocaixa/FluxoCaixaMovimentacoesForm';
import FluxoCaixaConfigCategoriasList from '@/pages/financeiro/fluxocaixa/FluxoCaixaConfigCategoriasList';
import FluxoCaixaConfigCategoriasForm from '@/pages/financeiro/fluxocaixa/FluxoCaixaConfigCategoriasForm';
import RelatoriosFluxoCaixa from '@/pages/financeiro/fluxocaixa/relatorios/RelatoriosFluxoCaixa';
import HistoricoConciliacoes from '@/pages/financeiro/HistoricoConciliacoes';
import BaixasPage from '@/pages/financeiro/BaixasPage';
import RelatoriosFinanceiros from '@/pages/financeiro/relatorios/RelatoriosFinanceiros';

import CRMClientes from '@/pages/crm/CRMClientes';
import CRMKanban from '@/pages/crm/CRMKanban';
import CRMPropostas from '@/pages/crm/CRMPropostas';
import CRMDashboard from '@/pages/crm/CRMDashboard';

import EmpresasList from '@/pages/cadastros/EmpresasList';
import EmpresasForm from '@/pages/cadastros/EmpresasForm';
import ClientesList from '@/pages/cadastros/ClientesList';
import ClientesForm from '@/pages/cadastros/ClientesForm';
import FornecedoresList from '@/pages/cadastros/FornecedoresList';
import FornecedoresForm from '@/pages/cadastros/FornecedoresForm';
import ProdutosList from '@/pages/cadastros/ProdutosList';
import ProdutosForm from '@/pages/cadastros/ProdutosForm';
import ServicosList from '@/pages/cadastros/ServicosList';
import ServicosForm from '@/pages/cadastros/ServicosForm';
import BancosList from '@/pages/cadastros/BancosList';
import BancosForm from '@/pages/cadastros/BancosForm';
import CentroCustosList from '@/pages/cadastros/CentroCustosList';
import CentroCustosForm from '@/pages/cadastros/CentroCustosForm';
import CategoriasList from '@/pages/cadastros/CategoriasList';
import CategoriasForm from '@/pages/cadastros/CategoriasForm';
import SubcategoriasList from '@/pages/cadastros/SubcategoriasList';
import SubcategoriasForm from '@/pages/cadastros/SubcategoriasForm';
import TipoPagamentoList from '@/pages/cadastros/TipoPagamentoList';
import TipoPagamentoForm from '@/pages/cadastros/TipoPagamentoForm';
import CondicaoPagamentoList from '@/pages/cadastros/CondicaoPagamentoList';
import CondicaoPagamentoForm from '@/pages/cadastros/CondicaoPagamentoForm';
import TipoDocumentoList from '@/pages/cadastros/TipoDocumentoList';
import TipoDocumentoForm from '@/pages/cadastros/TipoDocumentoForm';
import UnidadesMedidaPage from '@/pages/cadastros/UnidadesMedidaPage';
import OrigemPage from '@/pages/cadastros/OrigemPage';
import TributosPage from '@/pages/cadastros/TributosPage';
import TipoProdutoList from '@/pages/cadastros/TipoProdutoList';
import TipoProdutoForm from '@/pages/cadastros/TipoProdutoForm';

import OrcamentosList from '@/pages/vendas/OrcamentosList';
import OrcamentosForm from '@/pages/vendas/OrcamentosForm';
import OrcamentoItensList from '@/pages/vendas/OrcamentoItensList';
import OrcamentoItensForm from '@/pages/vendas/OrcamentoItensForm';
import PedidosList from '@/pages/vendas/PedidosList';
import PedidosForm from '@/pages/vendas/PedidosForm';
import PedidosItensList from '@/pages/vendas/PedidosItensList';
import PedidosItensForm from '@/pages/vendas/PedidosItensForm';
import RelatoriosVendas from '@/pages/vendas/relatorios/RelatoriosVendas';

import FiscalDashboard from '@/pages/fiscal/FiscalDashboard';
import PedidosVendaFiscalPage from '@/pages/fiscal/pedidos-venda/PedidosVendaFiscalPage';
import NfeProductsPage from '@/pages/fiscal/nfe-produtos/NfeProductsPage';
import NfeEmissionForm from '@/pages/fiscal/nfe-produtos/NfeEmissionForm';
import NfeDetailView from '@/pages/fiscal/nfe-produtos/NfeDetailView';
import NfseServicosPage from '@/pages/fiscal/nfse-servicos/NfseServicosPage';
import NfseServicosFormPage from '@/pages/fiscal/nfse-servicos/NfseServicosFormPage';
import NfseServicosDetailView from '@/pages/fiscal/nfse-servicos/NfseServicosDetailView';
import ManifestacaoNFPage from '@/pages/fiscal/manifestacao-nf/ManifestacaoNFPage';
import ManifestacaoNFDetail from '@/pages/fiscal/manifestacao-nf/ManifestacaoNFDetail';
import EntradaNFList from '@/pages/fiscal/entrada-nf/EntradaNFList';
import EntradaNFForm from '@/pages/fiscal/entrada-nf/EntradaNFForm';
import EntradaNFDetail from '@/pages/fiscal/entrada-nf/EntradaNFDetail';
import ParametrosFiscaisPage from '@/pages/fiscal/parametros-fiscais/ParametrosFiscaisPage';
import ApuracaoImpostosListPage from '@/pages/fiscal/apuracao-impostos/ApuracaoImpostosListPage';
import ApuracaoImpostosFormPage from '@/pages/fiscal/apuracao-impostos/ApuracaoImpostosFormPage';
import ApuracaoImpostosDetailPage from '@/pages/fiscal/apuracao-impostos/ApuracaoImpostosDetailPage';

import ContabilidadeDashboard from '@/pages/contabilidade/ContabilidadeDashboard';
import FechamentoMensalList from '@/pages/contabilidade/fechamento/FechamentoMensalList';
import FechamentoMensalForm from '@/pages/contabilidade/fechamento/FechamentoMensalForm';
import FechamentoMensalDetail from '@/pages/contabilidade/fechamento/FechamentoMensalDetail';
import DocumentosContabilidadePage from '@/pages/contabilidade/documentos/DocumentosContabilidadePage';
import DocumentosContabilidadeForm from '@/pages/contabilidade/documentos/DocumentosContabilidadeForm';
import DocumentosContabilidadeDetail from '@/pages/contabilidade/documentos/DocumentosContabilidadeDetail';
import LancamentosContabeisPage from '@/pages/contabilidade/LancamentosContabeisPage';
import LancamentosContabeisForm from '@/pages/contabilidade/lancamentos/LancamentosContabeisForm';
import LancamentosContabeisDetail from '@/pages/contabilidade/lancamentos/LancamentosContabeisDetail';
import PendenciasContabeisPage from '@/pages/contabilidade/PendenciasContabeisPage';
import DREBalanceteDetailPage from '@/pages/contabilidade/DREBalanceteDetailPage';
import ParametrosContabeisPage from '@/pages/contabilidade/parametros/ParametrosContabeisPage';

import PedidosCompraList from '@/pages/compras/PedidosCompraList';
import PedidosCompraForm from '@/pages/compras/PedidosCompraForm';
import NotasFiscaisEntradaList from '@/pages/compras/NotasFiscaisEntradaList';
import NotasFiscaisEntradaForm from '@/pages/compras/NotasFiscaisEntradaForm';
import EntradaNotasFiscaisPage from '@/pages/compras/notas-fiscais/EntradaNotasFiscaisPage';
import RelatoriosCompras from '@/pages/compras/relatorios/RelatoriosCompras';
import EntradaEstoqueList from '@/pages/estoque/EntradaEstoqueList';
import EntradaEstoqueForm from '@/pages/estoque/EntradaEstoqueForm';
import MovimentacaoEstoqueList from '@/pages/estoque/MovimentacaoEstoqueList';
import MovimentacaoEstoqueForm from '@/pages/estoque/MovimentacaoEstoqueForm';
import InventarioList from '@/pages/estoque/InventarioList';
import InventarioForm from '@/pages/estoque/InventarioForm';
import ReservasList from '@/pages/estoque/ReservasList';
import TransferenciasList from '@/pages/estoque/TransferenciasList';
import TransferenciasForm from '@/pages/estoque/TransferenciasForm';

import ProjetosPage from '@/pages/projetos/ProjetosPage';
import ProjetosFormNew from '@/pages/projetos/ProjetosForm';
import ProjetosKanbanList from '@/pages/projetos/ProjetosKanbanList';
import ProjetosReports from '@/pages/projetos/ProjetosReports';

import F5Dashboard from '@/pages/metodologia-f5/F5Dashboard';
import F5Metodologia from '@/pages/metodologia-f5/F5Metodologia';
import F5ProjetosList from '@/pages/metodologia-f5/F5ProjetosList';
import F5ProjetosForm from '@/pages/metodologia-f5/F5ProjetosForm';
import F5EtapasList from '@/pages/metodologia-f5/F5EtapasList';
import F5EtapasForm from '@/pages/metodologia-f5/F5EtapasForm';
import F5ChecklistsList from '@/pages/metodologia-f5/F5ChecklistsList';
import F5ChecklistsForm from '@/pages/metodologia-f5/F5ChecklistsForm';
import F5EntregaveisList from '@/pages/metodologia-f5/F5EntregaveisList';
import F5EntregaveisForm from '@/pages/metodologia-f5/F5EntregaveisForm';
import F5KPIsList from '@/pages/metodologia-f5/F5KPIsList';
import F5KPIsForm from '@/pages/metodologia-f5/F5KPIsForm';
import F5ProjetoDetail from '@/pages/metodologia-f5/F5ProjetoDetail';
import F5EtapaDetail from '@/pages/metodologia-f5/F5EtapaDetail';
import F5Relatorios from '@/pages/metodologia-f5/F5Relatorios';
import F5ConfigPermissions from '@/pages/metodologia-f5/F5ConfigPermissions';
import F5AuditoriaLog from '@/pages/metodologia-f5/F5AuditoriaLog';
import F1Diagnosis from '@/pages/metodologia-f5/F1Diagnosis';
import F1DiagnosisSelector from '@/pages/metodologia-f5/F1DiagnosisSelector';
import F2Execution from '@/pages/metodologia-f5/F2Execution';
import F3Monitoring from '@/pages/metodologia-f5/F3Monitoring';
import F4Planning from '@/pages/metodologia-f5/F4Planning';
import F5Governance from '@/pages/metodologia-f5/F5Governance';
import RelatorioF1 from '@/pages/metodologia-f5/RelatorioF1';
import HistoricoF1 from '@/pages/metodologia-f5/HistoricoF1';
import BPODashboard from '@/pages/bpo/BPODashboard';
import BPOClientesList from '@/pages/bpo/BPOClientesList';
import BPOClientesForm from '@/pages/bpo/BPOClientesForm';
import ClienteFasesPage from '@/pages/bpo/ClienteFasesPage';
import BPOClienteFasesPage from '@/pages/bpo/BPOClienteFasesPage';
import BPOClienteFaseForm from '@/pages/bpo/BPOClienteFaseForm';
import BPOClienteDetail from '@/pages/bpo/BPOClienteDetail';
import BPOFaseDetail from '@/pages/bpo/BPOFaseDetail';
import ClientesBPOPage from '@/pages/bpo/ClientesBPOPage';
import BPOClientesCadastroList from '@/pages/bpo/BPOClientesCadastroList';
import BPOClientesCadastroForm from '@/pages/bpo/BPOClientesCadastroForm';
import DRE from '@/pages/controladoria/DRE';
import PontoEquilibrio from '@/pages/controladoria/PontoEquilibrio';
import FichasCustoList from '@/pages/custos/FichasCustoList';
import FichasCustoForm from '@/pages/custos/FichasCustoForm';
import FichasCustoItensList from '@/pages/custos/FichasCustoItensList';
import FichasCustoItensForm from '@/pages/custos/FichasCustoItensForm';
import FichaTecnicaList from '@/pages/custos/FichaTecnicaList';
import RHDashboard from '@/pages/rh/RHDashboard';
import RHFuncionariosList from '@/pages/rh/RHFuncionariosList';
import RHFuncionariosForm from '@/pages/rh/RHFuncionariosForm';
import RHFuncionarioDetail from '@/pages/rh/RHFuncionarioDetail';
import RHConvencaoColetiva from '@/pages/rh/RHConvencaoColetiva';
import RHHoleritesPage from '@/pages/rh/RHHoleritesPage';
import RHBeneficios from '@/pages/rh/RHBeneficios';
import RHMedicinaOcupacional from '@/pages/rh/RHMedicinaOcupacional';
import RHDesempenho from '@/pages/rh/RHDesempenho';
import RHPoliticasManuais from '@/pages/rh/RHPoliticasManuais';
import RHDescricaoCargos from '@/pages/rh/RHDescricaoCargos';
import RHOrganogramas from '@/pages/rh/RHOrganogramas';
import RHControlePontoPage from '@/pages/rh/RHControlePontoPage';

import ClientePageRouter from '@/pages/bpo/cadastro/ClientePageRouter';

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const CRMContextWrapper = ({ children }) => {
  return <CRMProvider>{children}</CRMProvider>;
};

const ContabilidadeContextWrapper = ({ children }) => {
  return <ContabilidadeProvider>{children}</ContabilidadeProvider>;
};

const ProtectedLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      <Layout>
        {children}
      </Layout>
    </ProtectedRoute>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      initializeF5Data();
      initializeBPOData();
    } catch (e) {
      console.error("Initialization failed:", e);
    }
  }, []);

  return (
    <SessionValidator>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Rotas Públicas */}
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/auth/callback" element={<PageTransition><Callback /></PageTransition>} />
          <Route path="/auth/set-password" element={<PageTransition><SetPassword /></PageTransition>} />

          {/* Rotas Protegidas */}
          <Route path="/" element={<ProtectedLayout><PageTransition><Dashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/importar-extrato" element={<Navigate to="/financeiro/importar-extrato" replace />} />

          <Route path="/cliente/:clientId/cadastro/:submenu" element={<ProtectedLayout><PageTransition><ClientePageRouter /></PageTransition></ProtectedLayout>} />

          <Route path="/crm/*" element={
            <ProtectedLayout>
              <CRMContextWrapper>
                <Routes>
                  <Route path="dashboard" element={<PageTransition><CRMDashboard /></PageTransition>} />
                  <Route path="clientes" element={<PageTransition><CRMClientes /></PageTransition>} />
                  <Route path="propostas" element={<PageTransition><CRMPropostas /></PageTransition>} />
                  <Route path="kanban" element={<PageTransition><CRMKanban /></PageTransition>} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </CRMContextWrapper>
            </ProtectedLayout>
          } />

          <Route path="/operacao/projeto/kanban" element={<ProtectedLayout><PageTransition><ProjetosKanbanList /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/projeto/relatorios" element={<ProtectedLayout><PageTransition><ProjetosReports /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/projeto/novo" element={<ProtectedLayout><PageTransition><ProjetosFormNew /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/projeto/:id" element={<ProtectedLayout><PageTransition><ProjetosFormNew /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/projeto" element={<ProtectedLayout><PageTransition><ProjetosPage /></PageTransition></ProtectedLayout>} />
          
          <Route path="/operacao/bpo-e5/clientes-bpo" element={<ProtectedLayout><PageTransition><BPOClientesList /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/bpo-e5/clientes-bpo/novo" element={<ProtectedLayout><PageTransition><BPOClientesForm /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/bpo-e5/clientes-bpo/:cliente_id/fases-bpo" element={<ProtectedLayout><PageTransition><BPOClienteFasesPage /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/bpo-e5/clientes/:cliente_id/fases" element={<ProtectedLayout><PageTransition><ClienteFasesPage /></PageTransition></ProtectedLayout>} />
          <Route path="/bpo/clientes/:cliente_id/fases" element={<ProtectedLayout><PageTransition><ClienteFasesPage /></PageTransition></ProtectedLayout>} />
          <Route path="/operacao/bpo-e5/clientes-bpo/:cliente_id/fases/:fase_id/editar" element={<ProtectedLayout><PageTransition><BPOClienteFaseForm /></PageTransition></ProtectedLayout>} />

          <Route path="/cadastros/bancos" element={<ProtectedLayout><PageTransition><BancosList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/bancos/novo" element={<ProtectedLayout><PageTransition><BancosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/bancos/:id" element={<ProtectedLayout><PageTransition><BancosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/categorias" element={<ProtectedLayout><PageTransition><CategoriasList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/categorias/novo" element={<ProtectedLayout><PageTransition><CategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/categorias/:id" element={<ProtectedLayout><PageTransition><CategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/centro-custos" element={<ProtectedLayout><PageTransition><CentroCustosList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/centro-custos/novo" element={<ProtectedLayout><PageTransition><CentroCustosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/centro-custos/:id" element={<ProtectedLayout><PageTransition><CentroCustosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/clientes" element={<ProtectedLayout><PageTransition><ClientesList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/clientes/novo" element={<ProtectedLayout><PageTransition><ClientesForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/clientes/:id" element={<ProtectedLayout><PageTransition><ClientesForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/condicao-pagamento" element={<ProtectedLayout><PageTransition><CondicaoPagamentoList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/condicao-pagamento/novo" element={<ProtectedLayout><PageTransition><CondicaoPagamentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/condicao-pagamento/:id" element={<ProtectedLayout><PageTransition><CondicaoPagamentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/empresas" element={<ProtectedLayout><PageTransition><EmpresasList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/empresas/novo" element={<ProtectedLayout><PageTransition><EmpresasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/empresas/:id" element={<ProtectedLayout><PageTransition><EmpresasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/fornecedores" element={<ProtectedLayout><PageTransition><FornecedoresList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/fornecedores/novo" element={<ProtectedLayout><PageTransition><FornecedoresForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/fornecedores/:id" element={<ProtectedLayout><PageTransition><FornecedoresForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/origem" element={<ProtectedLayout><PageTransition><OrigemPage /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/produtos" element={<ProtectedLayout><PageTransition><ProdutosList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/produtos/novo" element={<ProtectedLayout><PageTransition><ProdutosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/produtos/:id" element={<ProtectedLayout><PageTransition><ProdutosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/servicos" element={<ProtectedLayout><PageTransition><ServicosList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/servicos/novo" element={<ProtectedLayout><PageTransition><ServicosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/servicos/:id" element={<ProtectedLayout><PageTransition><ServicosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/subcategorias" element={<ProtectedLayout><PageTransition><SubcategoriasList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/subcategorias/novo" element={<ProtectedLayout><PageTransition><SubcategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/subcategorias/:id" element={<ProtectedLayout><PageTransition><SubcategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-documento" element={<ProtectedLayout><PageTransition><TipoDocumentoList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-documento/novo" element={<ProtectedLayout><PageTransition><TipoDocumentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-documento/:id" element={<ProtectedLayout><PageTransition><TipoDocumentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-pagamento" element={<ProtectedLayout><PageTransition><TipoPagamentoList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-pagamento/novo" element={<ProtectedLayout><PageTransition><TipoPagamentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-pagamento/:id" element={<ProtectedLayout><PageTransition><TipoPagamentoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-produto" element={<ProtectedLayout><PageTransition><TipoProdutoList /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-produto/novo" element={<ProtectedLayout><PageTransition><TipoProdutoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tipo-produto/:id" element={<ProtectedLayout><PageTransition><TipoProdutoForm /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/tributos" element={<ProtectedLayout><PageTransition><TributosPage /></PageTransition></ProtectedLayout>} />
          <Route path="/cadastros/unidades-medida" element={<ProtectedLayout><PageTransition><UnidadesMedidaPage /></PageTransition></ProtectedLayout>} />

          <Route path="/vendas/orcamentos" element={<ProtectedLayout><PageTransition><OrcamentosList /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/orcamentos/novo" element={<ProtectedLayout><PageTransition><OrcamentosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/orcamentos/:id" element={<ProtectedLayout><PageTransition><OrcamentosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/orcamentos/:id/editar" element={<ProtectedLayout><PageTransition><OrcamentosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/pedidos" element={<ProtectedLayout><PageTransition><PedidosList /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/pedidos/novo" element={<ProtectedLayout><PageTransition><PedidosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/pedidos/:id" element={<ProtectedLayout><PageTransition><PedidosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/pedidos/:id/editar" element={<ProtectedLayout><PageTransition><PedidosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/vendas/relatorios" element={<ProtectedLayout><PageTransition><RelatoriosVendas /></PageTransition></ProtectedLayout>} />

          <Route path="/financeiro/contas-pagar" element={<ProtectedLayout><PageTransition><ContasPagarList /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/contas-pagar/novo" element={<ProtectedLayout><PageTransition><ContasPagarForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/contas-pagar/:id" element={<ProtectedLayout><PageTransition><ContasPagarForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/contas-receber" element={<ProtectedLayout><PageTransition><ContasReceberList /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/contas-receber/novo" element={<ProtectedLayout><PageTransition><ContasReceberForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/contas-receber/:id" element={<ProtectedLayout><PageTransition><ContasReceberForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/cobranca" element={<ProtectedLayout><PageTransition><CobrancaKanbanIntegrated /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/cobranca/dashboard" element={<ProtectedLayout><PageTransition><CobrancaDashboardIntegrated /></PageTransition></ProtectedLayout>} />
          <Route path="/movimentacao-financeira/nova" element={<ProtectedLayout><PageTransition><NovaMovimentacaoPage /></PageTransition></ProtectedLayout>} />
          <Route path="/movimentacao-financeira" element={<ProtectedLayout><PageTransition><MovimentacaoFinanceiraPage /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/movimentacoes" element={<ProtectedLayout><PageTransition><MovimentacoesFinanceirasList /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/movimentacoes/novo" element={<ProtectedLayout><PageTransition><MovimentacoesFinanceirasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/movimentacoes/:id" element={<ProtectedLayout><PageTransition><MovimentacoesFinanceirasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa" element={<ProtectedLayout><PageTransition><FluxoCaixaDashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/movimentacoes" element={<ProtectedLayout><PageTransition><FluxoCaixaMovimentacoesList /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/movimentacoes/novo" element={<ProtectedLayout><PageTransition><FluxoCaixaMovimentacoesForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/movimentacoes/:id" element={<ProtectedLayout><PageTransition><FluxoCaixaMovimentacoesForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/config-categorias" element={<ProtectedLayout><PageTransition><FluxoCaixaConfigCategoriasList /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/config-categorias/novo" element={<ProtectedLayout><PageTransition><FluxoCaixaConfigCategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/config-categorias/:id" element={<ProtectedLayout><PageTransition><FluxoCaixaConfigCategoriasForm /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/fluxo-caixa/relatorios" element={<ProtectedLayout><PageTransition><RelatoriosFluxoCaixa /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/baixas" element={<ProtectedLayout><PageTransition><BaixasPage /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/conciliacao-bancaria" element={<ProtectedLayout><PageTransition><ConciliacaoBancariaPage /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/importar-extrato" element={<ProtectedLayout><PageTransition><ImportarExtratoPage /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/historico-conciliacoes" element={<ProtectedLayout><PageTransition><HistoricoConciliacoes /></PageTransition></ProtectedLayout>} />
          <Route path="/financeiro/relatorios" element={<ProtectedLayout><PageTransition><RelatoriosFinanceiros /></PageTransition></ProtectedLayout>} />

          <Route path="/fiscal/dashboard" element={<ProtectedLayout><PageTransition><FiscalDashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/pedidos-venda" element={<ProtectedLayout><PageTransition><PedidosVendaFiscalPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfe-produtos" element={<ProtectedLayout><PageTransition><NfeProductsPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfe-produtos/novo" element={<ProtectedLayout><PageTransition><NfeEmissionForm /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfe-produtos/:id" element={<ProtectedLayout><PageTransition><NfeDetailView /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfe-produtos/:id/editar" element={<ProtectedLayout><PageTransition><NfeEmissionForm /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfse-servicos" element={<ProtectedLayout><PageTransition><NfseServicosPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfse-servicos/novo" element={<ProtectedLayout><PageTransition><NfseServicosFormPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfse-servicos/:id" element={<ProtectedLayout><PageTransition><NfseServicosDetailView /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/nfse-servicos/:id/editar" element={<ProtectedLayout><PageTransition><NfseServicosFormPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/manifestacao-nf" element={<ProtectedLayout><PageTransition><ManifestacaoNFPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/manifestacao-nf/:id" element={<ProtectedLayout><PageTransition><ManifestacaoNFDetail /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/entrada-nf" element={<ProtectedLayout><PageTransition><EntradaNFList /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/entrada-nf/novo" element={<ProtectedLayout><PageTransition><EntradaNFForm /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/entrada-nf/:id" element={<ProtectedLayout><PageTransition><EntradaNFDetail /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/entrada-nf/:id/editar" element={<ProtectedLayout><PageTransition><EntradaNFForm /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/apuracao-impostos" element={<ProtectedLayout><PageTransition><ApuracaoImpostosListPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/apuracao-impostos/novo" element={<ProtectedLayout><PageTransition><ApuracaoImpostosFormPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/apuracao-impostos/:id" element={<ProtectedLayout><PageTransition><ApuracaoImpostosDetailPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/apuracao-impostos/:id/editar" element={<ProtectedLayout><PageTransition><ApuracaoImpostosFormPage /></PageTransition></ProtectedLayout>} />
          <Route path="/fiscal/parametros-fiscais" element={<ProtectedLayout><PageTransition><ParametrosFiscaisPage /></PageTransition></ProtectedLayout>} />

          <Route path="/contabilidade/*" element={
            <ProtectedLayout>
              <ContabilidadeContextWrapper>
                <Routes>
                  <Route path="dashboard" element={<PageTransition><ContabilidadeDashboard /></PageTransition>} />
                  <Route path="fechamento" element={<PageTransition><FechamentoMensalList /></PageTransition>} />
                  <Route path="fechamento/novo" element={<PageTransition><FechamentoMensalForm /></PageTransition>} />
                  <Route path="fechamento/:id" element={<PageTransition><FechamentoMensalDetail /></PageTransition>} />
                  <Route path="fechamento/:id/editar" element={<PageTransition><FechamentoMensalForm /></PageTransition>} />
                  <Route path="documentos" element={<PageTransition><DocumentosContabilidadePage /></PageTransition>} />
                  <Route path="documentos/novo" element={<PageTransition><DocumentosContabilidadeForm /></PageTransition>} />
                  <Route path="documentos/:id" element={<PageTransition><DocumentosContabilidadeDetail /></PageTransition>} />
                  <Route path="documentos/:id/editar" element={<PageTransition><DocumentosContabilidadeForm /></PageTransition>} />
                  <Route path="lancamentos" element={<PageTransition><LancamentosContabeisPage /></PageTransition>} />
                  <Route path="lancamentos/novo" element={<PageTransition><LancamentosContabeisForm /></PageTransition>} />
                  <Route path="lancamentos/:id" element={<PageTransition><LancamentosContabeisDetail /></PageTransition>} />
                  <Route path="lancamentos/:id/editar" element={<PageTransition><LancamentosContabeisForm /></PageTransition>} />
                  <Route path="pendencias/*" element={<PageTransition><PendenciasContabeisPage /></PageTransition>} />
                  <Route path="dre-balancete" element={<PageTransition><DREBalanceteDetailPage /></PageTransition>} />
                  <Route path="parametros" element={<PageTransition><ParametrosContabeisPage /></PageTransition>} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ContabilidadeContextWrapper>
            </ProtectedLayout>
          } />

          <Route path="/rh" element={<ProtectedLayout><PageTransition><RHDashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/funcionarios" element={<ProtectedLayout><PageTransition><RHFuncionariosList /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/funcionarios/novo" element={<ProtectedLayout><PageTransition><RHFuncionariosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/funcionarios/:id" element={<ProtectedLayout><PageTransition><RHFuncionarioDetail /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/funcionarios/:id/editar" element={<ProtectedLayout><PageTransition><RHFuncionariosForm /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/controle-ponto" element={<ProtectedLayout><PageTransition><RHControlePontoPage /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/folha-pagamento" element={<ProtectedLayout><PageTransition><RHHoleritesPage /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/beneficios" element={<ProtectedLayout><PageTransition><RHBeneficios /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/medicina-ocupacional" element={<ProtectedLayout><PageTransition><RHMedicinaOcupacional /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/desempenho" element={<ProtectedLayout><PageTransition><RHDesempenho /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/politicas-manuais" element={<ProtectedLayout><PageTransition><RHPoliticasManuais /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/descricao-cargos" element={<ProtectedLayout><PageTransition><RHDescricaoCargos /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/organogramas" element={<ProtectedLayout><PageTransition><RHOrganogramas /></PageTransition></ProtectedLayout>} />
          <Route path="/rh/convencao-coletiva" element={<ProtectedLayout><PageTransition><RHConvencaoColetiva /></PageTransition></ProtectedLayout>} />

          <Route path="/controladoria/dre" element={<ProtectedLayout><PageTransition><DRE /></PageTransition></ProtectedLayout>} />
          <Route path="/controladoria/ponto-equilibrio" element={<ProtectedLayout><PageTransition><PontoEquilibrio /></PageTransition></ProtectedLayout>} />
          
          <Route path="/custos/ficha-tecnica" element={<ProtectedLayout><PageTransition><FichaTecnicaList /></PageTransition></ProtectedLayout>} />
          <Route path="/custos/fichas-custo" element={<ProtectedLayout><PageTransition><FichasCustoList /></PageTransition></ProtectedLayout>} />

          {/* Rotas de Admin (Requer SuperAdminRoute) */}
          <Route path="/admin" element={<SuperAdminRoute><ProtectedLayout><PageTransition><AdminDashboard /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/dashboard" element={<SuperAdminRoute><ProtectedLayout><PageTransition><DashboardAdmin /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          
          <Route path="/admin/usuarios" element={<SuperAdminRoute><ProtectedLayout><PageTransition><UsuariosPage mode="list" /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/usuarios/novo" element={<SuperAdminRoute><ProtectedLayout><PageTransition><UsuariosPage mode="create" /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/usuarios/:userId" element={<SuperAdminRoute><ProtectedLayout><PageTransition><UsuariosPage mode="edit" /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          
          <Route path="/admin/roles" element={<SuperAdminRoute><ProtectedLayout><PageTransition><RolesList /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/roles/novo" element={<SuperAdminRoute><ProtectedLayout><PageTransition><RolesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/roles/:id" element={<SuperAdminRoute><ProtectedLayout><PageTransition><RolesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/permissoes" element={<SuperAdminRoute><ProtectedLayout><PageTransition><PermissoesList /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/permissoes/novo" element={<SuperAdminRoute><ProtectedLayout><PageTransition><PermissoesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/permissoes/:id" element={<SuperAdminRoute><ProtectedLayout><PageTransition><PermissoesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/times" element={<SuperAdminRoute><ProtectedLayout><PageTransition><TimesList /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/times/novo" element={<SuperAdminRoute><ProtectedLayout><PageTransition><TimesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/times/:id" element={<SuperAdminRoute><ProtectedLayout><PageTransition><TimesForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/logs" element={<SuperAdminRoute><ProtectedLayout><PageTransition><LogsAuditoria /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/seguranca" element={<SuperAdminRoute><ProtectedLayout><PageTransition><ConfiguracoesSeguracaForm /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/sessoes" element={<SuperAdminRoute><ProtectedLayout><PageTransition><SessoesAtivas /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/configuracoes/temas" element={<SuperAdminRoute><ProtectedLayout><PageTransition><SettingsTema /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/supabase-setup" element={<SuperAdminRoute><ProtectedLayout><PageTransition><SupabaseSetup /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/database-test" element={<SuperAdminRoute><ProtectedLayout><PageTransition><DatabaseTest /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/schema-initializer" element={<SuperAdminRoute><ProtectedLayout><PageTransition><SchemaInitializer /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/propostas-migration" element={<SuperAdminRoute><ProtectedLayout><PageTransition><PropostasMigration /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/municipios-migration" element={<SuperAdminRoute><ProtectedLayout><PageTransition><MunicipiosMigration /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/fiscal-municipios-migration" element={<SuperAdminRoute><ProtectedLayout><PageTransition><FiscalMunicipiosMigration /></PageTransition></ProtectedLayout></SuperAdminRoute>} />
          <Route path="/admin/fiscal-municipios-setup" element={<SuperAdminRoute><ProtectedLayout><PageTransition><FiscalMunicipiosSetup /></PageTransition></ProtectedLayout></SuperAdminRoute>} />

          {/* Rota Protegida de Limpar Dados */}
          <Route path="/admin/limpar-dados" element={<ProtectedLayout><PageTransition><LimparDados /></PageTransition></ProtectedLayout>} />

          <Route path="/metodologia-f5/dashboard" element={<ProtectedLayout><PageTransition><F5Dashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/diagnostico-f1" element={<ProtectedLayout><PageTransition><F1Diagnosis /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/historico" element={<ProtectedLayout><PageTransition><HistoricoF1 /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/projetos" element={<ProtectedLayout><PageTransition><F5ProjetosList /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/relatorios" element={<ProtectedLayout><PageTransition><F5Relatorios /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/permissoes" element={<ProtectedLayout><PageTransition><F5ConfigPermissions /></PageTransition></ProtectedLayout>} />
          <Route path="/metodologia-f5/auditoria" element={<ProtectedLayout><PageTransition><F5AuditoriaLog /></PageTransition></ProtectedLayout>} />

          <Route path="/bpo/dashboard" element={<ProtectedLayout><PageTransition><BPODashboard /></PageTransition></ProtectedLayout>} />
          <Route path="/bpo/clientes" element={<ProtectedLayout><PageTransition><BPOClientesList /></PageTransition></ProtectedLayout>} />
          <Route path="/clientes-bpo" element={<ProtectedLayout><PageTransition><ClientesBPOPage /></PageTransition></ProtectedLayout>} />
          <Route path="/clientes-bpo/cadastro-clientes" element={<ProtectedLayout><PageTransition><BPOClientesCadastroList /></PageTransition></ProtectedLayout>} />
          <Route path="/clientes-bpo/cadastro-clientes/novo" element={<ProtectedLayout><PageTransition><BPOClientesCadastroForm /></PageTransition></ProtectedLayout>} />
          <Route path="/clientes-bpo/cadastro-clientes/:id" element={<ProtectedLayout><PageTransition><BPOClientesCadastroForm /></PageTransition></ProtectedLayout>} />

          <Route path="/estoque/entrada" element={<ProtectedLayout><PageTransition><EntradaEstoqueList /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/entrada/novo" element={<ProtectedLayout><PageTransition><EntradaEstoqueForm /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/entrada/:id" element={<ProtectedLayout><PageTransition><EntradaEstoqueForm /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/movimentacao" element={<ProtectedLayout><PageTransition><MovimentacaoEstoqueList /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/inventario" element={<ProtectedLayout><PageTransition><InventarioList /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/inventario/novo" element={<ProtectedLayout><PageTransition><InventarioForm /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/inventario/:id" element={<ProtectedLayout><PageTransition><InventarioForm /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/reservas" element={<ProtectedLayout><PageTransition><ReservasList /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/transferencias" element={<ProtectedLayout><PageTransition><TransferenciasList /></PageTransition></ProtectedLayout>} />
          <Route path="/estoque/transferencias/novo" element={<ProtectedLayout><PageTransition><TransferenciasForm /></PageTransition></ProtectedLayout>} />

          <Route path="/compras/pedidos" element={<ProtectedLayout><PageTransition><PedidosCompraList /></PageTransition></ProtectedLayout>} />
          <Route path="/compras/pedidos/novo" element={<ProtectedLayout><PageTransition><PedidosCompraForm /></PageTransition></ProtectedLayout>} />
          <Route path="/compras/pedidos/:id" element={<ProtectedLayout><PageTransition><PedidosCompraForm /></PageTransition></ProtectedLayout>} />
          <Route path="/compras/notas-fiscais" element={<ProtectedLayout><PageTransition><EntradaNotasFiscaisPage /></PageTransition></ProtectedLayout>} />
          <Route path="/compras/relatorios" element={<ProtectedLayout><PageTransition><RelatoriosCompras /></PageTransition></ProtectedLayout>} />

          <Route path="*" element={<ProtectedLayout><PageTransition><Navigate to="/" replace /></PageTransition></ProtectedLayout>} />
        </Routes>
      </AnimatePresence>
    </SessionValidator>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <F5Provider> 
          <Helmet><title>ERP Platform</title></Helmet>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimatedRoutes />
            <Toaster />
          </Router>
        </F5Provider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;