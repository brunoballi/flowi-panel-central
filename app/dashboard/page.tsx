import Link from 'next/link'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  XCircleIcon,
  BanknotesIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EFFECTIVE_STATE_COLORS, EFFECTIVE_STATE_LABELS, formatDate, type EffectiveState } from '@/lib/subscription'
import { GrowthChart, type GrowthPoint } from './growth-chart'
import { RefreshButton } from './refresh-button'

interface SnapshotRow {
  plan: string | null
  status: string | null
  effective_state: EffectiveState | null
  current_period_end: string | null
  amount: number | null
  currency: string | null
  last_payment_amount: number | null
  last_payment_mp_fee: number | null
  last_payment_net: number | null
  last_payment_currency: string | null
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

const KPI_ICONS: Record<EffectiveState, typeof CheckCircleIcon> = {
  active: CheckCircleIcon,
  trial: ClockIcon,
  past_due: ExclamationTriangleIcon,
  blocked: XCircleIcon,
  cancelled: NoSymbolIcon,
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: tenantsRaw, error } = await supabase
    .from('tenants')
    .select(
      'id, nombre, slug, dominio, activo, created_at, subscription_snapshots(plan, status, effective_state, current_period_end, amount, currency, last_payment_amount, last_payment_mp_fee, last_payment_net, last_payment_currency, last_synced_at, last_sync_ok, last_sync_error)'
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
  let netTotal = 0
  let lastSyncedAt: string | null = null

  for (const t of tenants) {
    const snap = oneSnapshot(t.subscription_snapshots)
    if (snap?.last_synced_at && (!lastSyncedAt || snap.last_synced_at > lastSyncedAt)) {
      lastSyncedAt = snap.last_synced_at
    }
    if (!snap || !snap.effective_state) {
      counts.sin_sincronizar++
      continue
    }
    counts[snap.effective_state]++
    if (snap.effective_state === 'active') {
      if (snap.amount) mrr += Number(snap.amount)
      if (snap.last_payment_net) netTotal += Number(snap.last_payment_net)
    }
  }

  // Crecimiento: para cada tenant, el mes de su PRIMERA vez en active/trial
  // (no cada transición — un cliente que vuelve de past_due a active no es
  // un cliente nuevo). Con eso arriba, un acumulado mes a mes.
  const { data: history } = await supabase
    .from('subscription_snapshot_history')
    .select('tenant_id, effective_state, recorded_at')
    .in('effective_state', ['active', 'trial'])
    .order('recorded_at', { ascending: true })

  const firstActivationMonth = new Map<string, string>()
  for (const row of history ?? []) {
    if (!firstActivationMonth.has(row.tenant_id)) {
      firstActivationMonth.set(row.tenant_id, String(row.recorded_at).slice(0, 7))
    }
  }

  const newPerMonth = new Map<string, number>()
  for (const month of firstActivationMonth.values()) {
    newPerMonth.set(month, (newPerMonth.get(month) ?? 0) + 1)
  }

  const growthData: GrowthPoint[] = Array.from(newPerMonth.keys())
    .sort()
    .reduce<GrowthPoint[]>((acc, month) => {
      const previousTotal = acc.length > 0 ? acc[acc.length - 1].total : 0
      acc.push({ month, total: previousTotal + newPerMonth.get(month)! })
      return acc
    }, [])

  return (
    <div className="mx-auto max-w-6xl">
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Error cargando tenants: {error.message}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Resumen</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {lastSyncedAt
              ? `Última sincronización: ${new Date(lastSyncedAt).toLocaleString('es-AR')}`
              : 'Todavía no se sincronizó ningún tenant.'}
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard label="Activos" value={counts.active} state="active" />
        <KpiCard label="Prueba" value={counts.trial} state="trial" />
        <KpiCard label="Vencidos" value={counts.past_due} state="past_due" />
        <KpiCard label="Bloqueados" value={counts.blocked} state="blocked" />
        <KpiCard label="Cancelados" value={counts.cancelled} state="cancelled" />
        <KpiCard label="MRR bruto" value={`$${mrr.toLocaleString('es-AR')}`} icon={BanknotesIcon} color="#18181b" />
        <KpiCard
          label="Neto (post MP)"
          value={`$${netTotal.toLocaleString('es-AR')}`}
          icon={WalletIcon}
          color="#0d9488"
        />
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Crecimiento de clientes</h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">Total acumulado de clientes captados, mes a mes.</p>
        <GrowthChart data={growthData} />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Próximo cobro</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Comisión MP</th>
                <th className="px-4 py-3">Neto</th>
                <th className="px-4 py-3">Última sync</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500">
                    Todavía no hay tenants dados de alta.
                  </td>
                </tr>
              )}
              {tenants.map((t) => {
                const snap = oneSnapshot(t.subscription_snapshots)
                const state = snap?.effective_state ?? null
                return (
                  <tr
                    key={t.id}
                    className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${!t.activo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{t.nombre}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{t.dominio}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">{snap?.plan ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {state ? (
                          <span
                            className="rounded-full px-2 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: EFFECTIVE_STATE_COLORS[state] }}
                          >
                            {EFFECTIVE_STATE_LABELS[state]}
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            Sin sincronizar
                          </span>
                        )}
                        {snap && !snap.last_sync_ok && (
                          <span
                            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
                            title={snap.last_sync_error ?? undefined}
                          >
                            <ExclamationCircleIcon className="h-4 w-4" aria-hidden="true" />
                            último sync falló
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatDate(snap?.current_period_end ?? null)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                      {snap?.amount ? `$${Number(snap.amount).toLocaleString('es-AR')} ${snap.currency ?? ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {snap?.last_payment_mp_fee != null
                        ? `-$${Number(snap.last_payment_mp_fee).toLocaleString('es-AR')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                      {snap?.last_payment_net != null
                        ? `$${Number(snap.last_payment_net).toLocaleString('es-AR')} ${snap.last_payment_currency ?? ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                      {snap?.last_synced_at ? new Date(snap.last_synced_at).toLocaleString('es-AR') : 'nunca'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tenants/${t.id}/edit`}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
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
    </div>
  )
}

function KpiCard({
  label,
  value,
  state,
  icon,
  color,
}: {
  label: string
  value: string | number
  state?: EffectiveState
  icon?: typeof CheckCircleIcon
  color?: string
}) {
  const Icon = icon ?? (state ? KPI_ICONS[state] : undefined)
  const accent = color ?? (state ? EFFECTIVE_STATE_COLORS[state] : '#18181b')

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        {Icon && <Icon className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />}
      </div>
      <div className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  )
}
