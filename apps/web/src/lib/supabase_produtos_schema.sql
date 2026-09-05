-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Dados Básicos
    nome VARCHAR(255) NOT NULL,
    codigo_interno VARCHAR(50) UNIQUE,
    codigo_barras VARCHAR(50) UNIQUE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Produto Revenda', 'Produto Fabricado', 'Serviço', 'Assinatura')),
    unidade_medida VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    
    -- Classificação e Gestão
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    marca VARCHAR(100),
    linha_familia VARCHAR(100),
    centro_custo_id UUID REFERENCES public.centros_custos(id),
    conta_receita_id UUID REFERENCES public.contas_contabeis(id),
    conta_custo_id UUID REFERENCES public.contas_contabeis(id),
    
    -- Preços e Custos
    preco_custo DECIMAL(15,2) DEFAULT 0,
    ultimo_custo DECIMAL(15,2),
    custo_medio DECIMAL(15,2),
    custo_padrao DECIMAL(15,2),
    preco_venda DECIMAL(15,2) NOT NULL,
    margem DECIMAL(10,2),
    markup DECIMAL(10,2),
    permite_desconto BOOLEAN DEFAULT FALSE,
    desconto_maximo DECIMAL(5,2),
    
    -- Estoque
    controla_estoque BOOLEAN DEFAULT TRUE,
    estoque_atual DECIMAL(15,3) DEFAULT 0,
    estoque_minimo DECIMAL(15,3),
    estoque_maximo DECIMAL(15,3),
    deposito_localizacao VARCHAR(100),
    controle_lote BOOLEAN DEFAULT FALSE,
    controle_validade BOOLEAN DEFAULT FALSE,
    
    -- Impostos / Fiscal
    ncm VARCHAR(8),
    cst_csosn VARCHAR(10),
    cfop_padrao VARCHAR(10),
    origem_mercadoria VARCHAR(50),
    aliquota_icms DECIMAL(5,2),
    aliquota_pis DECIMAL(5,2),
    aliquota_cofins DECIMAL(5,2),
    iss DECIMAL(5,2),
    
    -- Fornecedores
    fornecedor_principal_id UUID REFERENCES public.fornecedores(id),
    codigo_produto_fornecedor VARCHAR(50),
    prazo_entrega_dias INTEGER,
    ultimo_fornecedor VARCHAR(255),
    
    -- Dados Comerciais
    comissionavel BOOLEAN DEFAULT FALSE,
    percentual_comissao DECIMAL(5,2),
    vendavel_online BOOLEAN DEFAULT FALSE,
    exibir_catalogo BOOLEAN DEFAULT FALSE,
    
    -- Descrições e Anexos
    descricao_curta VARCHAR(255),
    descricao_detalhada TEXT,
    observacoes_internas TEXT,
    imagem_url TEXT,
    documentos JSONB DEFAULT '[]',
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno ON public.produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_status ON public.produtos(status);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON public.produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);