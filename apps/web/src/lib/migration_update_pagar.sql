-- Rename columns in contas_pagar to match requested structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contas_pagar' AND column_name = 'status') THEN
        ALTER TABLE contas_pagar RENAME COLUMN status TO status_pagamento;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contas_pagar' AND column_name = 'observacoes') THEN
        ALTER TABLE contas_pagar RENAME COLUMN observacoes TO observacoes_pagamento;
    END IF;
END $$;

-- Add data_baixa if it doesn't exist
ALTER TABLE IF EXISTS contas_pagar 
ADD COLUMN IF NOT EXISTS data_baixa DATE;

-- Ensure parcelamento columns exist (idempotent)
ALTER TABLE IF EXISTS contas_pagar 
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_atual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parcela_grupo_id UUID,
ADD COLUMN IF NOT EXISTS intervalo_dias INTEGER DEFAULT 30;