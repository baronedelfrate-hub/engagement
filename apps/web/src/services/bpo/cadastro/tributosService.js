import { supabase } from '@/lib/customSupabaseClient';

const getTableName = (clientId) => {
  return `clientes_bpo_${clientId.replace(/-/g, '_')}_tributos`;
};

export const fetchAll = async (clientId) => {
  try {
    const tableName = getTableName(clientId);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching tributos:', error);
    return { data: null, error };
  }
};

export const fetchById = async (clientId, id) => {
  try {
    const tableName = getTableName(clientId);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching tributo:', error);
    return { data: null, error };
  }
};

export const create = async (clientId, data) => {
  try {
    const tableName = getTableName(clientId);
    const { data: result, error } = await supabase
      .from(tableName)
      .insert([{ ...data, cliente_bpo_id: clientId }])
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error('Error creating tributo:', error);
    return { data: null, error };
  }
};

export const update = async (clientId, id, data) => {
  try {
    const tableName = getTableName(clientId);
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error('Error updating tributo:', error);
    return { data: null, error };
  }
};

export const deleteRecord = async (clientId, id) => {
  try {
    const tableName = getTableName(clientId);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting tributo:', error);
    return { error };
  }
};