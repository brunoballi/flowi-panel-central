// ============================================================
// Sync manual, disparada por el botón "Actualizar ahora" del dashboard.
// Autenticada con la sesión del usuario (RLS: authenticated → true en
// tenants/subscription_snapshots), no con CRON_SECRET — a diferencia de
// app/api/cron/sync-subscriptions, que corre sin sesión.
// ============================================================

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncAllTenants } from '@/lib/sync'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const result = await syncAllTenants(supabase)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
