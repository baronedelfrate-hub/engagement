import { supabase } from '@/lib/customSupabaseClient';

// Chama a edge function focus-nfe (tokens ficam só no servidor, por empresa).
const chamar = async (corpo) => {
  const { data, error } = await supabase.functions.invoke('focus-nfe', { body: corpo });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const focusNfe = {
  getConfig: (empresa_id) => chamar({ acao: 'config_get', empresa_id }),
  saveConfig: (cfg, empresa_id) => chamar({ acao: 'config_save', empresa_id, ...cfg }),
  testar: (empresa_id) => chamar({ acao: 'testar', empresa_id }),
  emitir: (tipo, payload, extra = {}) => chamar({ acao: 'emitir', tipo, payload, ...extra }),
  consultar: (tipo, ref) => chamar({ acao: 'consultar', tipo, ref }),
  cancelar: (tipo, ref, justificativa) => chamar({ acao: 'cancelar', tipo, ref, justificativa }),
  sincronizar: (tipo) => chamar({ acao: 'sincronizar', tipo }),
  manifestar: (chave, tipo, justificativa) => chamar({ acao: 'manifestar', chave, tipo, justificativa }),
  baixar: (tipo, chave, formato) => chamar({ acao: 'baixar', tipo, chave, formato }),
  arquivo: (url) => chamar({ acao: 'arquivo', url }),
};
