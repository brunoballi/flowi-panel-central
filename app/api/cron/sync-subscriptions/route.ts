// ============================================================
// Disparado por GitHub Actions cada 1 hora (.github/workflows/sync-
// subscriptions.yml) porque Vercel Hobby solo permite cron diario — mismo
// mecanismo que ya usa GESTOR_BARBERIA para sus propios recordatorios.
//
// La lógica de sync está en lib/sync.ts, compartida con el botón manual
// "Actualizar ahora" del dashboard (app/api/tenants/sync).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncAllTenants } from '@/lib/sync'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await syncAllTenants(createSupabaseAdminClient())
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error desconocido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
