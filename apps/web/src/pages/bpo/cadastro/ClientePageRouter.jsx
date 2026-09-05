import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { getEntityLabel } from '@/lib/bpoCadastroUtils';
import SkeletonLoader from '@/components/SkeletonLoader';

// Import list components
import BancosList from './lists/BancosList';
import CategoriasList from './lists/CategoriasList';
import CentrosCustoList from './lists/CentrosCustoList';
import ClientesList from './lists/ClientesList';
import CondicoesPagamentoList from './lists/CondicoesPagamentoList';
import EmpresasList from './lists/EmpresasList';
import FornecedoresList from './lists/FornecedoresList';
import OrigemList from './lists/OrigemList';
import ProdutosList from './lists/ProdutosList';
import ServicosList from './lists/ServicosList';
import SubcategoriasList from './lists/SubcategoriasList';
import TiposDocumentoList from './lists/TiposDocumentoList';
import TiposPagamentoList from './lists/TiposPagamentoList';
import TiposProdutoList from './lists/TiposProdutoList';
import TributosList from './lists/TributosList';
import UnidadesMedidaList from './lists/UnidadesMedidaList';

// Import form components
import BancosForm from './forms/BancosForm';
import CategoriasForm from './forms/CategoriasForm';
import CentrosCustoForm from './forms/CentrosCustoForm';
import ClientesForm from './forms/ClientesForm';
import CondicoesPagamentoForm from './forms/CondicoesPagamentoForm';
import EmpresasForm from './forms/EmpresasForm';
import FornecedoresForm from './forms/FornecedoresForm';
import OrigemForm from './forms/OrigemForm';
import ProdutosForm from './forms/ProdutosForm';
import ServicosForm from './forms/ServicosForm';
import SubcategoriasForm from './forms/SubcategoriasForm';
import TiposDocumentoForm from './forms/TiposDocumentoForm';
import TiposPagamentoForm from './forms/TiposPagamentoForm';
import TiposProdutoForm from './forms/TiposProdutoForm';
import TributosForm from './forms/TributosForm';
import UnidadesMedidaForm from './forms/UnidadesMedidaForm';

const ClientePageRouter = () => {
  const { clientId, submenu } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadClientName();
  }, [clientId]);

  const loadClientName = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes_bpo')
        .select('nome')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClientName(data.nome);
    } catch (err) {
      setError('Cliente não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const getComponent = () => {
    const componentMap = {
      'bancos': { list: BancosList, form: BancosForm },
      'categorias': { list: CategoriasList, form: CategoriasForm },
      'centros-custo': { list: CentrosCustoList, form: CentrosCustoForm },
      'clientes': { list: ClientesList, form: ClientesForm },
      'condicoes-pagamento': { list: CondicoesPagamentoList, form: CondicoesPagamentoForm },
      'empresas': { list: EmpresasList, form: EmpresasForm },
      'fornecedores': { list: FornecedoresList, form: FornecedoresForm },
      'origem': { list: OrigemList, form: OrigemForm },
      'produtos': { list: ProdutosList, form: ProdutosForm },
      'servicos': { list: ServicosList, form: ServicosForm },
      'subcategorias': { list: SubcategoriasList, form: SubcategoriasForm },
      'tipos-documento': { list: TiposDocumentoList, form: TiposDocumentoForm },
      'tipos-pagamento': { list: TiposPagamentoList, form: TiposPagamentoForm },
      'tipo-produto': { list: TiposProdutoList, form: TiposProdutoForm },
      'tributos': { list: TributosList, form: TributosForm },
      'unidades-medida': { list: UnidadesMedidaList, form: UnidadesMedidaForm },
    };

    const components = componentMap[submenu];
    if (!components) return null;

    const isFormMode = mode === 'new' || mode === 'edit';
    const Component = isFormMode ? components.form : components.list;
    
    return <Component clientId={clientId} />;
  };

  if (loading) {
    return <SkeletonLoader count={3} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Erro</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const Component = getComponent();

  if (!Component) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Submenu Inválido</h2>
          <p className="text-muted-foreground">O submenu "{submenu}" não foi encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/clientes-bpo" className="hover:text-foreground transition-colors">
          BPO
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{clientName}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Cadastro</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{getEntityLabel(submenu)}</span>
      </nav>

      {/* Render Component */}
      {Component}
    </div>
  );
};

export default ClientePageRouter;