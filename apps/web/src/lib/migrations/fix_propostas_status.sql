-- ==============================================================================
-- Migration: Fix Propostas Status and Add Constraint
-- Description: Standardizes status values in the propostas table and enforces
--              a CHECK constraint to prevent future invalid entries.
-- Valid Statuses: 'LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'
-- ==============================================================================

-- 1. Drop existing constraint if it exists
ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;

-- 2. Map known variations to standardized valid statuses
UPDATE propostas 
SET status = 'ENVIADO_FATURAMENTO' 
WHERE status IN ('ENVIADO P/ FATURAMENTO', 'ENVIADO_PARA_FATURAMENTO', 'ENVIADO_P_FATURAMENTO');

UPDATE propostas 
SET status = 'NEGOCIACAO' 
WHERE status IN ('NEGOCIAÇÃO', 'NEGOCIANDO');

UPDATE propostas 
SET status = 'GANHA' 
WHERE status IN ('GANHO');

-- 3. Update NULL values and any remaining unrecognized statuses to default 'LEAD'
UPDATE propostas 
SET status = 'LEAD' 
WHERE status IS NULL OR status NOT IN ('LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO');

-- 4. Add CHECK Constraint
ALTER TABLE propostas 
ADD CONSTRAINT propostas_status_check 
CHECK (status IN ('LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'));

-- 5. Create or Replace Migration RPC Function
CREATE OR REPLACE FUNCTION public.fix_propostas_status_migration()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    rows_updated integer := 0;
    total_updated integer := 0;
BEGIN
    ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check;

    UPDATE propostas SET status = 'ENVIADO_FATURAMENTO' WHERE status IN ('ENVIADO P/ FATURAMENTO', 'ENVIADO_PARA_FATURAMENTO', 'ENVIADO_P_FATURAMENTO');
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
    
    UPDATE propostas SET status = 'NEGOCIACAO' WHERE status IN ('NEGOCIAÇÃO', 'NEGOCIANDO');
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;

    UPDATE propostas SET status = 'GANHA' WHERE status = 'GANHO';
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
    
    UPDATE propostas SET status = 'LEAD' WHERE status IS NULL OR status NOT IN ('LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO');
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;

    ALTER TABLE propostas ADD CONSTRAINT propostas_status_check CHECK (status IN ('LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'));

    RETURN json_build_object('success', true, 'message', 'Migration applied successfully.', 'rows_updated', total_updated);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 6. Final Verification Query
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'propostas_status_check';