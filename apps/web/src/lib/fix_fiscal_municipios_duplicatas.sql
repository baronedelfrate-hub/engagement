-- Script SQL para correção de duplicatas na tabela fiscal_municipios_ibge

-- 1. Remover duplicatas usando ctid (mantendo apenas 1 registro por codigo_ibge)
DELETE FROM fiscal_municipios_ibge
WHERE ctid NOT IN (
    SELECT min(ctid)
    FROM fiscal_municipios_ibge
    GROUP BY codigo_ibge
);

-- 2. Limpar registros inválidos
DELETE FROM fiscal_municipios_ibge WHERE codigo_ibge IS NULL OR codigo_ibge = '';

-- 3. Adicionar constraint UNIQUE para evitar futuros erros
ALTER TABLE fiscal_municipios_ibge DROP CONSTRAINT IF EXISTS fiscal_municipios_ibge_codigo_ibge_key;
ALTER TABLE fiscal_municipios_ibge ADD CONSTRAINT fiscal_municipios_ibge_codigo_ibge_key UNIQUE (codigo_ibge);

-- 4. Criar Índices para otimizar buscas (autocomplete)
CREATE INDEX IF NOT EXISTS idx_fiscal_municipios_ibge_codigo ON fiscal_municipios_ibge(codigo_ibge);
CREATE INDEX IF NOT EXISTS idx_fiscal_municipios_ibge_nome ON fiscal_municipios_ibge(nome_municipio);
CREATE INDEX IF NOT EXISTS idx_fiscal_municipios_ibge_uf ON fiscal_municipios_ibge(uf);

-- 5. Inserir municípios principais com UPSERT (ON CONFLICT DO UPDATE)
INSERT INTO fiscal_municipios_ibge (id, codigo_ibge, nome_municipio, uf, ativo)
VALUES 
(gen_random_uuid(), '3520509', 'Indaiatuba', 'SP', true),
(gen_random_uuid(), '3525904', 'Jundiaí', 'SP', true),
(gen_random_uuid(), '3304557', 'Rio de Janeiro', 'RJ', true),
(gen_random_uuid(), '1100205', 'Porto Velho', 'RO', true),
(gen_random_uuid(), '1200179', 'Santa Rosa do Purus', 'AC', true),
(gen_random_uuid(), '3550308', 'São Paulo', 'SP', true),
(gen_random_uuid(), '3106200', 'Belo Horizonte', 'MG', true)
ON CONFLICT (codigo_ibge) DO UPDATE SET 
nome_municipio = EXCLUDED.nome_municipio,
uf = EXCLUDED.uf,
ativo = true;