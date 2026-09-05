import { BPO_TABLES, getTableInfo } from './supabaseTableUtils';
import { supabase } from '@/services/supabaseClient';

/**
 * Checks which tables already exist in the database
 */
export const checkTablesExist = async () => {
  if (!supabase || supabase.isConnected === false) {
    return { 
      success: false, 
      message: 'Cliente Supabase não inicializado ou em modo offline. Verifique as variáveis de ambiente.' 
    };
  }

  const results = {};
  const errors = [];

  for (const table of BPO_TABLES) {
    const { exists, error } = await getTableInfo(table);
    results[table] = exists;
    if (error && error !== 'relation does not exist') {
      errors.push(`Erro ao verificar ${table}: ${error}`);
    }
  }

  return { success: true, results, errors };
};

/**
 * Simulates initialization of tables.
 * REALITY CHECK: Client-side JS cannot run CREATE TABLE statements directly without
 * special extensions (pg_tle) or RPC functions setup on the server.
 * This function provides the SQL for the user or attempts a hypothetical RPC call.
 */
export const initializeBPOTables = async () => {
  if (!supabase || supabase.isConnected === false) {
    return {
      success: false,
      message: 'Supabase não conectado.'
    };
  }

  // In a real scenario with standard setup, we can't create tables from here.
  // We will check if they exist, and if not, we instruct the user.
  // OR, if a helper RPC 'exec_sql' exists (common in dev tools), we try it.
  
  const { results } = await checkTablesExist();
  const missingTables = BPO_TABLES.filter(t => !results[t]);

  if (missingTables.length === 0) {
    return {
      success: true,
      message: 'Todas as tabelas já existem!',
      tables: BPO_TABLES
    };
  }

  // Attempt to use a theoretical RPC function if available, otherwise fail gracefully with instructions
  try {
    // This is where we would call a stored procedure if it existed
    // const { error } = await supabase.rpc('init_bpo_schema');
    // if (error) throw error;
    
    // Since we likely don't have that, we return a specific status code
    return {
      success: false,
      partial: true,
      message: 'Não é possível criar tabelas via cliente web por segurança. Por favor, execute o script SQL disponível no painel do Supabase.',
      missingTables
    };

  } catch (error) {
    return {
      success: false,
      message: `Falha na inicialização: ${error.message}`
    };
  }
};

/**
 * Seeds initial sample data for BPO module
 */
export const seedInitialData = async () => {
  if (!supabase || supabase.isConnected === false) return { success: false, message: 'Supabase offline' };

  try {
    // 1. Check if we have clients
    const { data: existingClients } = await supabase.from('bpo_clientes').select('id').limit(1);
    
    if (existingClients && existingClients.length > 0) {
      return { success: true, message: 'Dados já existem. Skipping seed.' };
    }

    // 2. Insert Sample Client
    const { data: client, error: clientError } = await supabase.from('bpo_clientes').insert([
      {
        nome_empresa: 'Empresa Demo Ltda',
        responsavel_principal: 'João Silva',
        email_contato: 'joao@demo.com',
        fase_atual: 'B1',
        status_onboarding: 'Em andamento',
        data_inicio_contrato: new Date().toISOString()
      }
    ]).select().single();

    if (clientError) throw clientError;

    // 3. Insert B1 Record
    const { error: b1Error } = await supabase.from('bpo_fase_b1').insert([
      {
        bpo_cliente_id: client.id,
        contrato_assinado: true,
        status: 'Em andamento'
      }
    ]);

    if (b1Error) throw b1Error;

    return { success: true, message: 'Dados de teste inseridos com sucesso!' };

  } catch (error) {
    console.error('Seeding Error:', error);
    return { success: false, message: `Erro ao inserir dados: ${error.message}` };
  }
};