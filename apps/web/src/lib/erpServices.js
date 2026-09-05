import { supabase } from '@/services/supabaseClient';
import { resolveCompanyId } from '@/lib/companyUtils';

/**
 * Generic CRUD Service for ERP Modules
 * Handles standardized operations for all entities with enhanced logging and RLS support.
 */

const getPagination = (page, limit) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
};

const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

const logOperation = (operation, table, data = null, error = null) => {
  if (error) {
    console.error(`❌ [${table}] ${operation} Falhou:`, error);
    if (data) console.error('   Dados da tentativa:', data);
  } else {
    console.log(`✅ [${table}] ${operation} Sucesso`);
    // if (data) console.log('   Dados:', data); // Uncomment for verbose success logs
  }
};

const genericService = (tableName) => ({
  list: async ({ page = 1, limit = 10, filters = {}, sortBy = 'created_at', sortOrder = 'desc', search = '', searchColumns = ['nome'] }) => {
    try {
      const { from, to } = getPagination(page, limit);
      
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' });

      // Apply Search
      if (search && searchColumns.length > 0) {
        const searchCondition = searchColumns
          .map(col => `${col}.ilike.%${search}%`)
          .join(',');
        query = query.or(searchCondition);
      }

      // Apply Filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply Pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logOperation('List', tableName, filters, error);
        throw error;
      }

      return {
        success: true,
        data,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao listar registros' };
    }
  },

  read: async (id) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logOperation('Read', tableName, { id }, error);
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Registro não encontrado' };
    }
  },

  create: async (data) => {
    try {
      const user = await getCurrentUser();

      // Resolve o company_id do usuário logado (a menos que já tenha sido informado explicitamente)
      const companyId = data.company_id !== undefined
        ? data.company_id
        : await resolveCompanyId(user);

      const buildPayload = (includeCompanyId) => {
        const p = {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // created_by: user?.id || null, // Optional: if column exists
        };
        if (includeCompanyId && companyId && p.company_id === undefined) {
          p.company_id = companyId;
        }
        // Remove undefined keys to prevent sending "undefined" to DB
        Object.keys(p).forEach(key => p[key] === undefined && delete p[key]);
        return p;
      };

      let payload = buildPayload(true);

      console.log(`📤 [${tableName}] Tentando criar novo registro...`, payload);

      let { data: created, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();

      // Se a tabela não tiver a coluna company_id, tenta novamente sem ela
      if (error && error.code === '42703' && payload.company_id !== undefined) {
        console.warn(`⚠️ [${tableName}] Tabela não possui coluna 'company_id'. Tentando novamente sem ela...`);
        payload = buildPayload(false);
        ({ data: created, error } = await supabase
          .from(tableName)
          .insert(payload)
          .select()
          .single());
      }

      if (error) {
        // Special handling for RLS errors
        if (error.code === '42501') {
           console.error('🔒 Erro de Permissão (RLS): Verifique se você está logado e tem permissão para inserir nesta tabela.');
        }
        logOperation('Create', tableName, payload, error);
        throw error;
      }
      
      logOperation('Create', tableName, created);
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao criar registro' };
    }
  },

  update: async (id, data) => {
    try {
      const payload = {
          ...data,
          updated_at: new Date().toISOString()
      };

      // Remove undefined keys
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      // Remove 'id' and 'created_at' from update payload to be safe
      delete payload.id;
      delete payload.created_at;

      console.log(`🔄 [${tableName}] Atualizando registro ${id}...`, payload);

      const { data: updated, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logOperation('Update', tableName, payload, error);
        throw error;
      }
      
      logOperation('Update', tableName, updated);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao atualizar registro' };
    }
  },

  delete: async (id) => {
    try {
      // Attempt Soft Delete first if column exists (requires checking schema or blindly trying update)
      // For standard implementation here, we will try Hard Delete.
      // If Soft Delete is required, schema must support 'deleted_at'
      
      console.log(`🗑️ [${tableName}] Excluindo registro ${id}...`);

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        logOperation('Delete', tableName, { id }, error);
        throw error;
      }
      
      logOperation('Delete', tableName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao excluir registro' };
    }
  },

  // Helper to debug RLS policies
  debugRLS: async () => {
    const user = await getCurrentUser();
    console.log(`🕵️ RLS Debug for [${tableName}]:`);
    console.log('   User:', user ? `Logged in (${user.email})` : 'Anonymous');
    const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (error) console.log('   Read Access: ❌ Denied', error.message);
    else console.log('   Read Access: ✅ Granted (Visible rows:', count, ')');
  }
});

// Export instances for each table
export const erpServices = {
  // Cadastros
  empresas: genericService('empresas'),
  clientes: genericService('clientes'),
  fornecedores: genericService('fornecedores'),
  produtos: genericService('produtos'),
  servicos: genericService('servicos'),
  bancos: genericService('bancos'),
  centrosCusto: genericService('centros_custo'),
  categorias: genericService('categorias'),
  subcategorias: genericService('subcategorias'),
  tiposPagamento: genericService('tipos_pagamento'),
  condicoesPagamento: genericService('condicoes_pagamento'),
  tiposDocumento: genericService('tipos_documento'),
  unidadesMedida: genericService('unidades_medida'),
  origem: genericService('origem'),
  tributos: genericService('tributos'),

  // Vendas
  orcamentos: genericService('orcamentos'),
  orcamentoItens: genericService('orcamento_itens'),
  pedidosVenda: genericService('pedidos_venda'),
  pedidosVendaItens: genericService('pedidos_venda_itens'),

  // Compras
  pedidosCompra: genericService('pedidos_compra'),
  pedidosCompraItens: genericService('pedidos_compra_itens'),
  notasFiscaisEntrada: genericService('notas_fiscais_entrada'),
  notasFiscaisItens: genericService('notas_fiscais_itens'),
  entradasEstoque: genericService('entradas_estoque'),

  // Financeiro
  contasPagar: genericService('contas_pagar'),
  contasPagarBaixas: genericService('contas_pagar_baixas'),
  contasReceber: genericService('contas_receber'),
  contasReceberBaixas: genericService('contas_receber_baixas'),
  movimentacoesFinanceiras: genericService('movimentacoes_financeiras'),
  conciliacoesBancarias: genericService('conciliacoes_bancarias'),

  // Fluxo de Caixa
  fluxoCaixaMovimentacoes: genericService('fluxo_caixa_movimentacoes'),
  fluxoCaixaConfigCategorias: genericService('fluxo_caixa_config_categorias'),

  // Controladoria
  dreLinhas: genericService('dre_linhas'),
  dreMovimentacoes: genericService('dre_movimentacoes'),
  indicadoresKpi: genericService('indicadores_kpi'),

  // Custos
  fichasCusto: genericService('fichas_custo'),
  fichasCustoItens: genericService('fichas_custo_itens'),

  // RH
  funcionarios: genericService('funcionarios'),
  pontoRegistros: genericService('ponto_registros'),
  ferias: genericService('ferias'),
  horasExtras: genericService('horas_extras'),
  beneficios: genericService('beneficios'),

  // Projetos
  projetos: genericService('projetos'),
  projetosKanban: genericService('projetos_kanban'),
  projetosCards: genericService('projetos_cards'),

  // F5
  f5Projetos: genericService('f5_projetos'),
  f5Etapas: genericService('f5_etapas'),
  f5Checklists: genericService('f5_checklists'),
  f5Entregaveis: genericService('f5_entregaveis'),
  f5Kpis: genericService('f5_kpis'),

  // Admin
  users: genericService('users'),
  roles: genericService('roles'),
  permissions: genericService('permissions'),
  rolePermissions: genericService('role_permissions'),
  userRoles: genericService('user_roles'),
  auditLogs: genericService('audit_logs'),
};