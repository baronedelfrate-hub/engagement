import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckupnneaeswdnrckulck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdXBubmVhZXN3ZG5yY2t1bGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDM0NDEsImV4cCI6MjA3OTY3OTQ0MX0.h_gmMVy9EerqFKYznznqnqEhssLCqt4oTVwRjGkE89E';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
