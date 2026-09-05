import { supabase } from '@/lib/customSupabaseClient';

const VALID_STATUSES = ['LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'];

export const migrationService = {
  /**
   * Fetches all unique status values and their counts from the propostas table.
   */
  async getPropostasStats() {
    try {
      const { data, error } = await supabase
        .from('propostas')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data.length,
        valid: 0,
        invalid: 0,
        distribution: {},
        invalidValues: new Set()
      };

      data.forEach(row => {
        const status = row.status;
        stats.distribution[status] = (stats.distribution[status] || 0) + 1;
        
        if (VALID_STATUSES.includes(status)) {
          stats.valid++;
        } else {
          stats.invalid++;
          stats.invalidValues.add(status === null ? 'NULL' : status);
        }
      });

      stats.invalidValues = Array.from(stats.invalidValues);
      return { success: true, stats };
    } catch (error) {
      console.error('Error fetching propostas stats:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Executes the migration RPC to clean data and create constraint.
   */
  async runMigration() {
    try {
      const { data, error } = await supabase.rpc('fix_propostas_status_migration');
      
      if (error) throw error;

      return { 
        success: data.success, 
        message: data.message,
        rowsUpdated: data.rows_updated
      };
    } catch (error) {
      console.error('Error running migration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Verifies if the check constraint was successfully applied.
   */
  async verifyConstraint() {
    try {
      const { data, error } = await supabase.rpc('check_propostas_constraint');
      
      if (error) throw error;
      
      return { success: true, hasConstraint: data };
    } catch (error) {
      console.error('Error verifying constraint:', error);
      return { success: false, error: error.message };
    }
  }
};