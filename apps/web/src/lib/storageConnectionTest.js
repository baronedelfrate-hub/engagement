import { supabase } from '@/lib/customSupabaseClient';

/**
 * Utility to test Supabase Storage connectivity.
 * Verifies if the client can list buckets and check accessibility.
 */
export const testStorageConnection = async () => {
  if (!supabase) {
    return {
      connected: false,
      error: 'Supabase client is not initialized.',
      details: 'Check your environment variables and client configuration.'
    };
  }

  try {
    // Attempt to list buckets as a basic connectivity test
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('[Storage Test] Failed to list buckets:', error);
      return {
        connected: false,
        error: error.message || 'Failed to communicate with Supabase Storage API.',
        details: JSON.stringify(error, null, 2)
      };
    }

    // Check specifically for common buckets if needed, but listing is usually enough for a ping test
    const bucketNames = buckets?.map(b => b.name) || [];

    return {
      connected: true,
      buckets: bucketNames,
      message: 'Successfully connected to Supabase Storage.'
    };
  } catch (err) {
    console.error('[Storage Test] Network or unexpected error:', err);
    return {
      connected: false,
      error: err.message || 'Network error occurred while testing storage.',
      details: err.stack
    };
  }
};