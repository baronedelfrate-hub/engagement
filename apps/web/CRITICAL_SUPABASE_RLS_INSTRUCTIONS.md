# CRITICAL: Supabase Row-Level Security (RLS) Configuration Required

## ⚠️ MANDATORY MANUAL STEP AFTER CODE CLEANUP

This application has been configured to operate **WITHOUT authentication checks** in the code. To allow unauthenticated database inserts (specifically for the `extrato_bancario` table), you **MUST disable Row-Level Security (RLS)** in your Supabase project.

---

## Option 1: Disable RLS via SQL Editor (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **SQL Editor**
3. Run the following SQL command: