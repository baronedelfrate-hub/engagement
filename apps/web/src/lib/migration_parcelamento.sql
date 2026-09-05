-- Migration to add parcelamento columns to contas_pagar and contas_receber

-- Add columns to contas_pagar
ALTER TABLE IF EXISTS contas_pagar 
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_grupo_id UUID,
ADD COLUMN IF NOT EXISTS intervalo_dias INTEGER DEFAULT 30;

-- Add columns to contas_receber
ALTER TABLE IF EXISTS contas_receber
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_grupo_id UUID,
ADD COLUMN IF NOT EXISTS intervalo_dias INTEGER DEFAULT 30;