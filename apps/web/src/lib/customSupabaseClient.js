import { createClient } from '@supabase/supabase-js';

// Banco no Brasil (sa-east-1), por LGPD. O projeto antigo (ckupnneaeswdnrckulck, us-east-2) fica de reserva.
const supabaseUrl = 'https://plqjffuhlkvbwdipapxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBscWpmZnVobGt2YndkaXBhcHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjU1MDYsImV4cCI6MjEwODUwMTUwNn0.Jk_HGBOfV2jgcWY8f1nkZbYk-e8oPzoCtN0fVgDN7pc';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
