import { supabase } from './customSupabaseClient';

export const NotaFiscalLogger = {
  async log(level, action, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      details,
    };
    
    // Log to console
    if (level === 'ERROR') {
      console.error(`[${action}]`, details);
    } else if (level === 'WARN') {
      console.warn(`[${action}]`, details);
    } else {
      console.log(`[${action}]`, details);
    }

    // Optionally log to Supabase audit_logs
    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert([{
        acao: action,
        tabela: 'notas_fiscais',
        user_id: userData?.user?.id || null,
        valores_novos: logEntry,
        ip_address: 'browser',
        user_agent: navigator.userAgent
      }]);
    } catch (e) {
      console.error('Failed to write to audit_logs', e);
    }
  },

  info(action, details) {
    return this.log('INFO', action, details);
  },

  error(action, details) {
    return this.log('ERROR', action, details);
  },

  warn(action, details) {
    return this.log('WARN', action, details);
  }
};