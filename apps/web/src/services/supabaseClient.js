/**
 * DOCUMENTATION: Supabase Client Singleton
 * 
 * To prevent "Multiple GoTrueClient instances" warnings and ensure a single 
 * connection pool, this file now acts as a strict re-export of the primary
 * client initialized in `src/lib/customSupabaseClient.js`. 
 * 
 * All legacy imports of `src/services/supabaseClient` will now seamlessly 
 * use the exact same instance as `src/lib/customSupabaseClient`.
 */
import { supabase as customSupabase } from '@/lib/customSupabaseClient';

// Ensure we are exposing the single source of truth
export const supabase = customSupabase;

/**
 * Helper to check connection status using the singleton instance
 */
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('empresas').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Conectado ao Supabase com sucesso!' };
  } catch (err) {
    console.error('[Supabase Check] Falha na conexão:', err);
    return { success: false, message: `Erro de conexão: ${err.message}` };
  }
};