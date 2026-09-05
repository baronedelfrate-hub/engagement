import { supabase } from '@/services/supabaseClient';

/**
 * Tests basic connectivity to Supabase using a minimal approach.
 * Checks if the client can communicate with the server.
 */
export const testSupabaseConnection = async () => {
    // 1. Client Initialization Check
    if (!supabase) {
        return { 
            connected: false, 
            error: "Cliente Supabase não inicializado." 
        };
    }

    // 2. Network/API Check
    // We try to fetch the session. This is a very lightweight call 
    // that doesn't require database table permissions.
    try {
        const { data, error } = await supabase.auth.getSession();
        
        // If we get a response (even if session is null), we are connected to Supabase API
        if (!error || (data && !error)) {
            return { connected: true };
        }

        // If specific network error
        if (error && (error.message.includes('fetch') || error.message.includes('network'))) {
            return { 
                connected: false, 
                error: `Erro de rede: ${error.message}` 
            };
        }

        // If API responds with an error (e.g. invalid key), we are "connected" but auth failed.
        // For a simple "connection test", this is usually considered a failure to configure correctly.
        return { 
            connected: false, 
            error: `Erro da API Supabase: ${error.message}` 
        };

    } catch (err) {
        return { 
            connected: false, 
            error: `Exceção inesperada: ${err.message}` 
        };
    }
};