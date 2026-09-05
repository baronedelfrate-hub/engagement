-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Clientes BPO (Extensão do cadastro de clientes ERP)
CREATE TABLE IF NOT EXISTS bpo_clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE, -- Link com tabela principal de clientes
    nome_empresa VARCHAR(255) NOT NULL,
    responsavel_principal VARCHAR(255),
    email_contato VARCHAR(255),
    fase_atual VARCHAR(50) DEFAULT 'B1', -- B1, B2, B3, B4, B5
    status_onboarding VARCHAR(50) DEFAULT 'Pendente',
    data_inicio_contrato DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fase B1 - Onboarding
CREATE TABLE IF NOT EXISTS bpo_fase_b1 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    contrato_assinado BOOLEAN DEFAULT FALSE,
    contrato_arquivo TEXT, -- URL do arquivo
    manual_cliente_enviado BOOLEAN DEFAULT FALSE,
    acessos_bancarios_recebidos BOOLEAN DEFAULT FALSE,
    acessos_sistemas_recebidos BOOLEAN DEFAULT FALSE,
    clientes_cadastrados BOOLEAN DEFAULT FALSE,
    fornecedores_cadastrados BOOLEAN DEFAULT FALSE,
    plano_contas_configurado BOOLEAN DEFAULT FALSE,
    centros_custo_definidos BOOLEAN DEFAULT FALSE,
    rotina_financeira_alinhada BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Em andamento',
    data_conclusao DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fase B2 - Operação
CREATE TABLE IF NOT EXISTS bpo_fase_b2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    documentos_recebidos BOOLEAN DEFAULT FALSE,
    lancamentos_realizados BOOLEAN DEFAULT FALSE,
    conciliacao_bancaria_concluida BOOLEAN DEFAULT FALSE,
    contas_pagar_agendadas BOOLEAN DEFAULT FALSE,
    contas_receber_verificadas BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Operação ativa',
    pendencias_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fase B3 - Controle
CREATE TABLE IF NOT EXISTS bpo_fase_b3 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    fechamento_mensal_realizado BOOLEAN DEFAULT FALSE,
    auditoria_lancamentos_ok BOOLEAN DEFAULT FALSE,
    analise_divergencias_ok BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Aberto',
    data_fechamento DATE,
    resultado_mensal VARCHAR(50), -- Lucro, Prejuízo, Breakeven
    caixa_critico BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Fase B4 - Reporte
CREATE TABLE IF NOT EXISTS bpo_fase_b4 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    relatorio_enviado BOOLEAN DEFAULT FALSE,
    reuniao_agendada BOOLEAN DEFAULT FALSE,
    reuniao_realizada BOOLEAN DEFAULT FALSE,
    feedback_cliente TEXT,
    status VARCHAR(50) DEFAULT 'Pendente',
    data_reuniao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Fase B5 - Academy (Educação Financeira)
CREATE TABLE IF NOT EXISTS bpo_fase_b5 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    diagnostico_inicial_feito BOOLEAN DEFAULT FALSE,
    trilha_academy_definida BOOLEAN DEFAULT FALSE,
    treinamentos_realizados INTEGER DEFAULT 0,
    trilha_academy_concluida BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Não iniciado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Gestão de Acessos (Credenciais)
CREATE TABLE IF NOT EXISTS bpo_acessos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bpo_cliente_id UUID REFERENCES bpo_clientes(id) ON DELETE CASCADE,
    tipo_acesso VARCHAR(50) NOT NULL, -- Bancário, Sistema, Portal
    nome_instituicao VARCHAR(100) NOT NULL,
    usuario VARCHAR(255) NOT NULL,
    senha TEXT, -- Criptografada (recomendado uso de vault externo em prod)
    url_acesso TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bpo_clientes_fase ON bpo_clientes(fase_atual);
CREATE INDEX IF NOT EXISTS idx_bpo_fase_b1_cliente ON bpo_fase_b1(bpo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_bpo_fase_b2_cliente ON bpo_fase_b2(bpo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_bpo_fase_b3_cliente ON bpo_fase_b3(bpo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_bpo_acessos_cliente ON bpo_acessos(bpo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_bpo_acessos_tipo ON bpo_acessos(tipo_acesso);

-- Row Level Security (RLS)
ALTER TABLE bpo_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_fase_b1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_fase_b2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_fase_b3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_fase_b4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_fase_b5 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpo_acessos ENABLE ROW LEVEL SECURITY;

-- Policies (Exemplo simplificado - ajustar conforme sistema de auth real)
-- Permitir leitura para usuários autenticados
CREATE POLICY "Acesso leitura autenticados" ON bpo_clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados b1" ON bpo_fase_b1 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados b2" ON bpo_fase_b2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados b3" ON bpo_fase_b3 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados b4" ON bpo_fase_b4 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados b5" ON bpo_fase_b5 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acesso leitura autenticados acessos" ON bpo_acessos FOR SELECT TO authenticated USING (true);

-- Permitir modificação apenas para admins ou dono do registro (simplificado para auth users geral por enquanto)
CREATE POLICY "Acesso total autenticados" ON bpo_clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados b1" ON bpo_fase_b1 FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados b2" ON bpo_fase_b2 FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados b3" ON bpo_fase_b3 FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados b4" ON bpo_fase_b4 FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados b5" ON bpo_fase_b5 FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticados acessos" ON bpo_acessos FOR ALL TO authenticated USING (true);