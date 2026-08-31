// ============================================================
// Recorre todos los tenants activos y les pregunta (pull) su estado de
// suscripción vía GET {deploy_url}/api/internal/subscription-status.
//
// Disparado por GitHub Actions cada 1 hora (.github/workflows/sync-
// subscriptions.yml) porque Vercel Hobby solo permite cron diario — mismo
// mecanismo que ya usa GESTOR_BARBERIA para sus propios recordatorios.
//
// Un tenant caído o que no responde nunca frena la sync de los demás: cada
// uno va en su propio try/catch. Si falla, se marca last_sync_ok=false sin
// pisar el último estado bueno conocido.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/tenant-secret'
import { normalizePlan, type EffectiveState } from '@/lib/subscription'

const FETCH_TIMEOUT_MS = 8000

interface TenantToSync {
  id: string
  deploy_url: string
  ingest_secret_encrypted: string
}

interface RemoteStatusResponse {
  ok: boolean
  configured: boolean
  plan?: string
  status?: string
  effective_state?: EffectiveState
  current_period_end?: string | null
  grace_days?: number
  amount?: number | null
  currency?: string | null
  mp_preapproval_id?: string | null
  mp_payer_email?: string | null
  days_overdue?: number
}

async function fetchTenantStatus(deployUrl: string, secret: string): Promise<RemoteStatusResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(`${deployUrl}/api/internal/subscription-status`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as RemoteStatusResponse
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createSupabaseAdminClient()

  const { data: tenants, error: tenantsError } = await db
    .from('tenants')
    .select('id, deploy_url, ingest_secret_encrypted')
    .eq('activo', true)

  if (tenantsError) {
    return NextResponse.json({ ok: false, error: tenantsError.message }, { status: 500 })
  }

  const { data: existingSnapshots } = await db.from('subscription_snapshots').select('tenant_id, effective_state')
  const previousState = new Map((existingSnapshots ?? []).map((s) => [s.tenant_id, s.effective_state]))

  let synced = 0
  let failed = 0

  for (const tenant of (tenants ?? []) as TenantToSync[]) {
    try {
      const secret = decryptSecret(tenant.ingest_secret_encrypted)
      const remote = await fetchTenantStatus(tenant.deploy_url, secret)

      if (!remote.configured) {
        await db
          .from('subscription_snapshots')
          .upsert(
            { tenant_id: tenant.id, last_synced_at: new Date().toISOString(), last_sync_ok: true, last_sync_error: null },
            { onConflict: 'tenant_id' }
          )
        synced++
        continue
      }

      const plan = normalizePlan(remote.plan)
      const effectiveState = remote.effective_state ?? 'active'

      await db.from('subscription_snapshots').upsert(
        {
          tenant_id: tenant.id,
          plan,
          status: remote.status ?? null,
          effective_state: effectiveState,
          current_period_end: remote.current_period_end ?? null,
          grace_days: remote.grace_days ?? null,
          amount: remote.amount ?? null,
          currency: remote.currency ?? null,
          mp_preapproval_id: remote.mp_preapproval_id ?? null,
          mp_payer_email: remote.mp_payer_email ?? null,
          days_overdue: remote.days_overdue ?? null,
          last_synced_at: new Date().toISOString(),
          last_sync_ok: true,
          last_sync_error: null,
        },
        { onConflict: 'tenant_id' }
      )

      if (previousState.get(tenant.id) !== effectiveState) {
        await db.from('subscription_snapshot_history').insert({
          tenant_id: tenant.id,
          effective_state: effectiveState,
          plan,
          amount: remote.amount ?? null,
          currency: remote.currency ?? null,
        })
      }

      synced++
    } catch (e) {
      failed++
      const message = e instanceof Error ? e.message : 'error desconocido'
      await db
        .from('subscription_snapshots')
        .upsert(
          { tenant_id: tenant.id, last_synced_at: new Date().toISOString(), last_sync_ok: false, last_sync_error: message },
          { onConflict: 'tenant_id' }
        )
    }
  }

  return NextResponse.json({ ok: true, synced, failed, total: (tenants ?? []).length })
}
