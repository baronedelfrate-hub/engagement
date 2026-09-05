import { supabase } from '@/services/supabaseClient';

// --- Comprehensive List of ERP Tables ---
export const ERP_TABLES_TO_VALIDATE = [
    // Admin / Auth
    'users',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'audit_logs',

    // Cadastros Base
    'empresas', 
    'clientes',
    'fornecedores',
    'produtos',
    'servicos',
    'bancos',
    'centros_custo',
    'categorias',
    'subcategorias',
    'tipos_pagamento',
    'condicoes_pagamento',
    'tipos_documento',
    'unidades_medida',
    'origem',
    'tributos',

    // Vendas
    'orcamentos',
    'orcamento_itens',
    'pedidos_venda',
    'pedidos_venda_itens',

    // Compras
    'pedidos_compra',
    'pedidos_compra_itens',
    'notas_fiscais_entrada',
    'notas_fiscais_itens',
    
    // Estoque
    'entradas_estoque', // Linked to NFE
    'movimentacao_estoque',
    'inventario',
    'reservas',
    'transferencias',

    // Financeiro
    'contas_pagar',
    'contas_pagar_baixas',
    'contas_receber',
    'contas_receber_baixas',
    'movimentacoes_financeiras',
    'conciliacoes_bancarias',
    'fluxo_caixa_config_categorias',
    'fluxo_caixa_movimentacoes',

    // Controladoria
    'dre_linhas',
    'dre_movimentacoes',
    'indicadores_kpi',

    // Custos
    'fichas_custo',
    'fichas_custo_itens',

    // RH
    'funcionarios',
    'ponto_registros',
    'ferias',
    'horas_extras',
    'beneficios',

    // Projetos (Standard)
    'projetos',
    'projetos_kanban',
    'projetos_cards',

    // Metodologia F5
    'f5_projetos',
    'f5_etapas',
    'f5_checklists',
    'f5_entregaveis',
    'f5_kpis',

    // BPO Module
    'bpo_clientes',
    'bpo_fase_b1',
    'bpo_fase_b2',
    'bpo_fase_b3',
    'bpo_fase_b4',
    'bpo_fase_b5'
];

// --- SQL Schema Definition ---
export const ERP_SCHEMA_SQL = `
-- CADASTROS MODULE
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  inscricao_estadual text,
  email text,
  telefone text,
  site text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  ativo boolean DEFAULT true,
  logo text,
  logo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  codigo text,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS subcategorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  categoria_id uuid REFERENCES categorias(id),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  codigo text,
  nome text NOT NULL,
  agencia text,
  conta text,
  tipo_conta text,
  saldo numeric(15,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS tipos_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS condicoes_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  dias integer,
  percentual_desconto numeric(5,2),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS tipos_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  sigla text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  cnpj_cpf text,
  tipo_cliente text,
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  cnpj text,
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  sku text,
  categoria_id uuid REFERENCES categorias(id),
  subcategoria_id uuid REFERENCES subcategorias(id),
  preco_custo numeric(15,2),
  preco_venda numeric(15,2),
  estoque_minimo numeric(15,3),
  estoque_atual numeric(15,3),
  unidade_medida text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  preco numeric(15,2),
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- VENDAS MODULE
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  cliente_id uuid REFERENCES clientes(id),
  data_emissao date,
  data_validade date,
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  orcamento_id uuid REFERENCES orcamentos(id),
  produto_id uuid REFERENCES produtos(id),
  quantidade numeric(15,3),
  preco_unitario numeric(15,2),
  desconto numeric(15,2),
  valor_total numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS pedidos_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  cliente_id uuid REFERENCES clientes(id),
  data_pedido date,
  data_entrega date,
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS pedidos_venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  pedido_id uuid REFERENCES pedidos_venda(id),
  produto_id uuid REFERENCES produtos(id),
  quantidade numeric(15,3),
  preco_unitario numeric(15,2),
  desconto numeric(15,2),
  valor_total numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- COMPRAS MODULE
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  fornecedor_id uuid REFERENCES fornecedores(id),
  data_pedido date,
  data_entrega date,
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS pedidos_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  pedido_id uuid REFERENCES pedidos_compra(id),
  produto_id uuid REFERENCES produtos(id),
  quantidade numeric(15,3),
  preco_unitario numeric(15,2),
  desconto numeric(15,2),
  valor_total numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS notas_fiscais_entrada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero_nfe text,
  fornecedor_id uuid REFERENCES fornecedores(id),
  data_emissao date,
  data_entrada date,
  valor_total numeric(15,2),
  status text,
  xml_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS notas_fiscais_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nfe_id uuid REFERENCES notas_fiscais_entrada(id),
  produto_id uuid REFERENCES produtos(id),
  quantidade numeric(15,3),
  preco_unitario numeric(15,2),
  valor_total numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS entradas_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  nfe_id uuid REFERENCES notas_fiscais_entrada(id),
  data_entrada date,
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- FINANCEIRO MODULE
CREATE TABLE IF NOT EXISTS contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  fornecedor_id uuid REFERENCES fornecedores(id),
  data_emissao date,
  data_vencimento date,
  valor_original numeric(15,2),
  valor_pago numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS contas_pagar_baixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  conta_id uuid REFERENCES contas_pagar(id),
  data_pagamento date,
  valor_pago numeric(15,2),
  banco_id uuid REFERENCES bancos(id),
  numero_documento text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  cliente_id uuid REFERENCES clientes(id),
  data_emissao date,
  data_vencimento date,
  valor_original numeric(15,2),
  valor_recebido numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS contas_receber_baixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  conta_id uuid REFERENCES contas_receber(id),
  data_recebimento date,
  valor_recebido numeric(15,2),
  banco_id uuid REFERENCES bancos(id),
  numero_documento text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  tipo text, -- 'entrada' or 'saida'
  banco_id uuid REFERENCES bancos(id),
  data_movimentacao date,
  valor numeric(15,2),
  descricao text,
  categoria text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS conciliacoes_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  banco_id uuid REFERENCES bancos(id),
  data_conciliacao date,
  saldo_banco numeric(15,2),
  saldo_sistema numeric(15,2),
  diferenca numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- FLUXO DE CAIXA MODULE
CREATE TABLE IF NOT EXISTS fluxo_caixa_config_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  tipo text, -- 'receita' or 'despesa'
  cor text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS fluxo_caixa_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  data_movimentacao date,
  tipo text, -- 'previsto' or 'realizado'
  categoria text,
  valor numeric(15,2),
  descricao text,
  centro_custo_id uuid REFERENCES centros_custo(id),
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- CONTROLADORIA MODULE
CREATE TABLE IF NOT EXISTS dre_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  codigo text,
  nome text NOT NULL,
  tipo text, -- 'receita', 'despesa', 'custo'
  nivel integer,
  ordem integer,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS dre_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  dre_linha_id uuid REFERENCES dre_linhas(id),
  data_movimentacao date,
  valor numeric(15,2),
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS indicadores_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  formula text,
  valor_atual numeric(15,4),
  valor_meta numeric(15,4),
  unidade text,
  frequencia text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- CUSTOS MODULE
CREATE TABLE IF NOT EXISTS fichas_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  numero text,
  produto_id uuid REFERENCES produtos(id),
  data_criacao date,
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS fichas_custo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  ficha_id uuid REFERENCES fichas_custo(id),
  descricao text,
  quantidade numeric(15,3),
  valor_unitario numeric(15,2),
  valor_total numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- RH MODULE
CREATE TABLE IF NOT EXISTS funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,
  data_admissao date,
  cargo text,
  departamento text,
  salario numeric(15,2),
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS ponto_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  funcionario_id uuid REFERENCES funcionarios(id),
  data_registro date,
  hora_entrada time,
  hora_saida time,
  horas_trabalhadas numeric(5,2),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS ferias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  funcionario_id uuid REFERENCES funcionarios(id),
  data_inicio date,
  data_fim date,
  dias_utilizados integer,
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS horas_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  funcionario_id uuid REFERENCES funcionarios(id),
  data_registro date,
  horas numeric(5,2),
  valor_hora numeric(15,2),
  valor_total numeric(15,2),
  status text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  funcionario_id uuid REFERENCES funcionarios(id),
  tipo text,
  valor numeric(15,2),
  data_inicio date,
  data_fim date,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- PROJETOS & METODOLOGIA F5 MODULE
CREATE TABLE IF NOT EXISTS projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  status text,
  responsavel_id uuid, -- Reference to users or funcionarios
  orcamento numeric(15,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS projetos_kanban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  projeto_id uuid REFERENCES projetos(id),
  titulo text,
  descricao text,
  status text, -- 'todo', 'in_progress', 'done'
  prioridade text,
  responsavel_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS projetos_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  kanban_id uuid REFERENCES projetos_kanban(id),
  titulo text,
  descricao text,
  ordem integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS f5_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  status text,
  responsavel_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS f5_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  projeto_id uuid REFERENCES f5_projetos(id),
  numero text, -- 'F1', 'F2', etc
  nome text,
  descricao text,
  data_inicio date,
  data_fim date,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS f5_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  etapa_id uuid REFERENCES f5_etapas(id),
  item text,
  descricao text,
  concluido boolean DEFAULT false,
  data_conclusao timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS f5_entregaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  etapa_id uuid REFERENCES f5_etapas(id),
  nome text,
  descricao text,
  data_entrega date,
  status text,
  arquivo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS f5_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  projeto_id uuid REFERENCES f5_projetos(id),
  nome text,
  descricao text,
  valor_atual numeric(15,4),
  valor_meta numeric(15,4),
  unidade text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

-- ADMIN & SECURITY MODULE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nome text,
  ativo boolean DEFAULT true,
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text,
  descricao text,
  modulo text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id),
  permission_id uuid REFERENCES permissions(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  role_id uuid REFERENCES roles(id),
  company_id uuid REFERENCES empresas(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES empresas(id),
  user_id uuid, -- Reference to users
  acao text,
  tabela text,
  registro_id uuid,
  valores_antigos jsonb,
  valores_novos jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
`;

/**
 * Executes the SQL Schema Initialization via RPC
 */
export const initializeERPSchema = async () => {
    try {
        console.log("Iniciando migração de esquema ERP...");
        
        // Try to execute via RPC (Remote Procedure Call)
        // This requires a function named 'exec_sql' to exist in Postgres
        const { data, error } = await supabase.rpc('exec_sql', { 
            sql: ERP_SCHEMA_SQL 
        });

        if (error) {
            console.warn("RPC exec_sql falhou. Isso é esperado se a função não foi criada manualmente.", error);
            
            // Return failure but with the SQL so UI can help user
            return {
                success: false,
                method: 'rpc',
                error: error.message,
                sql: ERP_SCHEMA_SQL,
                message: "A execução automática falhou. A função 'exec_sql' não existe ou permissões são insuficientes. Por favor, execute o SQL manualmente no painel do Supabase."
            };
        }

        return {
            success: true,
            method: 'rpc',
            message: "Migração executada com sucesso via RPC!"
        };

    } catch (e) {
        return {
            success: false,
            error: e.message,
            sql: ERP_SCHEMA_SQL,
            message: `Erro de execução: ${e.message}`
        };
    }
};

/**
 * Validates existence of tables by attempting a simple select
 * Using this method instead of information_schema avoids permission issues
 * and works better with PostgREST
 */
export const validateTablesExist = async () => {
    const results = {
        existing: [],
        missing: [],
        summary: ''
    };

    try {
        // Execute checks in parallel
        const checks = await Promise.all(
            ERP_TABLES_TO_VALIDATE.map(async (tableName) => {
                try {
                    // Try to select just one ID to minimize load
                    const { error } = await supabase
                        .from(tableName)
                        .select('id')
                        .limit(1);

                    // If error code is '42P01' (undefined_table) or message says "does not exist", it's missing
                    // Note: Supabase/PostgREST might return 404 for missing table endpoint
                    if (error) {
                        const isMissing = 
                            error.code === '42P01' || 
                            (error.message && error.message.includes('does not exist')) ||
                            (error.message && error.message.includes('404'));

                        if (isMissing) {
                            return { table: tableName, exists: false };
                        }
                        
                        // If it's a permission error (401/403), the table likely exists but we can't read it.
                        // We count this as "exists" for the purpose of schema validation (it was created).
                        return { table: tableName, exists: true };
                    }
                    
                    return { table: tableName, exists: true };
                } catch (e) {
                    // Unexpected error, safer to assume missing or broken
                    return { table: tableName, exists: false };
                }
            })
        );

        // Sort results
        checks.forEach(check => {
            if (check.exists) {
                results.existing.push(check.table);
            } else {
                results.missing.push(check.table);
            }
        });

        results.summary = `${results.existing.length}/${ERP_TABLES_TO_VALIDATE.length} tabelas encontradas.`;
        return results;

    } catch (e) {
        console.error("Validation failed", e);
        return {
            existing: [],
            missing: ERP_TABLES_TO_VALIDATE,
            summary: "Erro crítico na validação."
        };
    }
};

/**
 * Legacy validation using information_schema
 * Kept for reference but validateTablesExist is preferred
 */
export const validateSchemaCreation = async () => {
    return validateTablesExist();
};