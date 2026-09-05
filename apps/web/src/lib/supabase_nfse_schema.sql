-- Tabela de Serviços para NFS-e
CREATE TABLE IF NOT EXISTS public.servicos_nfse (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codigo_servico VARCHAR(50) UNIQUE NOT NULL,
    cnae VARCHAR(20) NOT NULL,
    descricao TEXT,
    aliquota_iss DECIMAL(5,2) DEFAULT 2.00,
    retencao_obrigatoria BOOLEAN DEFAULT FALSE,
    tipo_servico VARCHAR(50) CHECK (tipo_servico IN ('consultoria', 'bpo', 'treinamento', 'outro')),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela Principal de NFS-e
CREATE TABLE IF NOT EXISTS public.notas_fiscais_servico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero SERIAL,
    serie VARCHAR(10) DEFAULT '1',
    pedido_venda_id UUID, -- Referência opcional
    cliente_id UUID NOT NULL, -- Referência à tabela clientes
    cnae VARCHAR(20),
    codigo_servico VARCHAR(50),
    descricao_servico TEXT,
    
    -- Datas
    data_emissao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Valores e Impostos
    valor_servicos DECIMAL(15,2) NOT NULL,
    valor_iss DECIMAL(15,2) DEFAULT 0,
    aliquota_iss DECIMAL(5,2) DEFAULT 0,
    iss_retido BOOLEAN DEFAULT FALSE,
    valor_pis DECIMAL(15,2) DEFAULT 0,
    valor_cofins DECIMAL(15,2) DEFAULT 0,
    valor_ir DECIMAL(15,2) DEFAULT 0,
    valor_csll DECIMAL(15,2) DEFAULT 0,
    valor_total DECIMAL(15,2) NOT NULL,
    
    -- Status e Controle
    status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'emitida', 'rejeitada', 'cancelada', 'substituida')),
    protocolo_autorizacao VARCHAR(100),
    xml TEXT,
    pdf TEXT, -- Caminho ou URL
    motivo_cancelamento TEXT,
    nfse_substituida_id UUID, -- Auto-relacionamento
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Tabela de Logs de Auditoria NFS-e
CREATE TABLE IF NOT EXISTS public.nfse_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nfse_id UUID REFERENCES public.notas_fiscais_servico(id),
    acao VARCHAR(50) CHECK (acao IN ('emissao', 'cancelamento', 'substituicao', 'erro', 'atualizacao')),
    status VARCHAR(50),
    mensagem TEXT,
    resposta_uninfe TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nfse_cliente ON public.notas_fiscais_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_nfse_status ON public.notas_fiscais_servico(status);
CREATE INDEX IF NOT EXISTS idx_nfse_data ON public.notas_fiscais_servico(data_emissao);
CREATE INDEX IF NOT EXISTS idx_nfse_numero ON public.notas_fiscais_servico(numero);