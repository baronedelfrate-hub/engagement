import { supabase } from '@/lib/customSupabaseClient';

/**
 * Clears all authentication related data from local storage.
 * Wrapped in a try-catch to prevent crashes if localStorage is unavailable.
 */
export const clearAuthStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clear specific known keys or clear all
      // Supabase typically uses 'sb-<project-ref>-auth-token'
      // To be safe and thorough as requested, we clear everything
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (error) {
    console.error('Failed to clear auth storage:', error);
  }
};

/**
 * Checks if a stored session exists and is structurally valid (not necessarily deeply verified with server).
 */
export const validateStoredSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return false;
    }
    
    // Check if the session is expired
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to validate stored session:', error);
    return false;
  }
};

/**
 * Attempts to restore a session from localStorage and validate it with Supabase.
 */
export const recoverSession = async () => {
  try {
    const isValid = await validateStoredSession();
    if (!isValid) {
      clearAuthStorage();
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      clearAuthStorage();
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error recovering session:', error);
    clearAuthStorage();
    return null;
  }
};