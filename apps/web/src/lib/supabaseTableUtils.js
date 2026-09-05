import { supabase } from '@/services/supabaseClient';

export const BPO_TABLES = [
  'bpo_clientes',
  'bpo_fase_b1',
  'bpo_fase_b2',
  'bpo_fase_b3',
  'bpo_fase_b4',
  'bpo_fase_b5',
  'bpo_acessos'
];

/**
 * Retrieves table information from Postgres information_schema
 * Note: Requires permissions to access information_schema which standard users might not have.
 * Fallback: Try a simple SELECT limit 0 to check existence.
 */
export const getTableInfo = async (tableName) => {
  if (!supabase || supabase.isConnected === false) return { exists: false, error: 'Supabase client not initialized' };

  try {
    // Attempt to select 1 row to see if table exists and we have access
    const { error } = await supabase.from(tableName).select('id').limit(1);
    
    if (error) {
      // Postgres error 42P01 means "relation does not exist"
      if (error.code === '42P01') {
        return { exists: false, error: null };
      }
      // Other errors (like permission denied) imply table might exist but we can't see it
      return { exists: false, error: error.message };
    }

    return { exists: true, error: null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
};

/**
 * Verifies if the table exists and logs the status
 */
export const verifyTableStructure = async (tableName) => {
  const info = await getTableInfo(tableName);
  return info;
};

/**
 * Lists all BPO tables expected in the system
 */
export const listAllBPOTables = () => {
  return BPO_TABLES;
};