import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EFFECTIVE_STATE_COLORS, EFFECTIVE_STATE_LABELS, formatDate, type EffectiveState } from '@/lib/subscription'
import { MonthlySignupsChart, type MonthlyCount } from './monthly-signups-chart'

interface SnapshotRow {
  plan: string | null
  status: string | null
  effective_state: EffectiveState | null
  current_period_end: string | null
  amount: number | null
  currency: string | null
  last_synced_at: string | null
  last_sync_ok: boolean
  last_sync_error: string | null
}

interface TenantRow {
  id: string
  nombre: string
  slug: string
  dominio: string
  activo: boolean
  created_at: string
  subscription_snapshots: SnapshotRow | SnapshotRow[] | null
}

function oneSnapshot(s: TenantRow['subscription_snapshots']): SnapshotRow | null {
  if (!s) return null
  return Array.isArray(s) ? (s[0] ?? null) : s
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: tenantsRaw, error } = await supabase
    .from('tenants')
    .select(
      'id, nombre, slug, dominio, activo, created_at, subscription_snapshots(plan, status, effective_state, current_period_end, amount, currency, last_synced_at, last_sync_ok, last_sync_error)'
    )
    .order('created_at', { ascending: false })

  const tenants = (tenantsRaw ?? []) as unknown as TenantRow[]

  const counts: Record<EffectiveState | 'sin_sincronizar', number> = {
    active: 0,
    trial: 0,
    past_due: 0,
    blocked: 0,
    cancelled: 0,
    sin_sincronizar: 0,
  }
  let mrr = 0

  for (const t of tenants) {
    const snap = oneSnapshot(t.subscription_snapshots)
    if (!snap || !snap.effective_state) {
      counts.sin_sincronizar++
      continue
    }
    counts[snap.effective_state]++
    if (snap.effective_state === 'active' && snap.amount) mrr += Number(snap.amount)
  }

  // Gráfico de altas por mes: transiciones hacia active/trial de los últimos 12 meses.
  const { data: history } = await supabase
    .from('subscription_snapshot_history')
    .select('effective_state, recorded_at')
    .in('effective_state', ['active', 'trial'])
    .order('recorded_at', { ascending: true })

  const monthCounts = new Map<string, number>()
  for (const row of history ?? []) {
    const month = String(row.recorded_at).slice(0, 7)
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
  }
  const chartData: MonthlyCount[] = Array.from(monthCounts.entries()).map(([month, count]) => ({ month, count }))

  return (
    <div className="mx-auto max-w-6xl">
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Error cargando tenants: {error.message}
        </p>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Activos" value={counts.active} color={EFFECTIVE_STATE_COLORS.active} />
        <KpiCard label="Prueba" value={counts.trial} color={EFFECTIVE_STATE_COLORS.trial} />
        <KpiCard label="Vencidos" value={counts.past_due} color={EFFECTIVE_STATE_COLORS.past_due} />
        <KpiCard label="Bloqueados" value={counts.blocked} color={EFFECTIVE_STATE_COLORS.blocked} />
        <KpiCard label="Cancelados" value={counts.cancelled} color={EFFECTIVE_STATE_COLORS.cancelled} />
        <KpiCard label="MRR estimado" value={`$${mrr.toLocaleString('es-AR')}`} color="#18181b" />
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Altas por mes</h2>
        <MonthlySignupsChart data={chartData} />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Próximo cobro</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Última sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  Todavía no hay tenants dados de alta.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const snap = oneSnapshot(t.subscription_snapshots)
              const state = snap?.effective_state ?? null
              return (
                <tr key={t.id} className={!t.activo ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{t.nombre}</div>
                    <div className="text-xs text-zinc-400">{t.dominio}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-700">{snap?.plan ?? '—'}</td>
                  <td className="px-4 py-3">
                    {state ? (
                      <span
                        className="rounded-full px-2 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: EFFECTIVE_STATE_COLORS[state] }}
                      >
                        {EFFECTIVE_STATE_LABELS[state]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
                        Sin sincronizar
                      </span>
                    )}
                    {snap && !snap.last_sync_ok && (
                      <span className="ml-2 text-xs text-red-600" title={snap.last_sync_error ?? undefined}>
                        ⚠ último sync falló
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{formatDate(snap?.current_period_end ?? null)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {snap?.amount ? `$${Number(snap.amount).toLocaleString('es-AR')} ${snap.currency ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {snap?.last_synced_at ? new Date(snap.last_synced_at).toLocaleString('es-AR') : 'nunca'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/tenants/${t.id}/edit`} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                      Editar
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-1 text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}
