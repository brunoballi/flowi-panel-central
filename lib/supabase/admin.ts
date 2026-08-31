import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role: pasa por arriba de RLS. Solo para el cron de
 * sincronización (app/api/cron/sync-subscriptions), que corre sin sesión de
 * usuario — lo llama GitHub Actions, no un browser logueado.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
