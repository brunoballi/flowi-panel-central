// ============================================================
// Lógica de estado de suscripción — copia literal de lib/subscription.ts
// del repo GESTOR_BARBERIA (computeSubscriptionState y tipos).
//
// Se copia y no se comparte como paquete a propósito: cada gestor de
// cliente es un repo independiente por diseño (mono-tenant), y esta
// función es pura y sin dependencias, así que el costo de tenerla
// duplicada acá es mínimo comparado con acoplar el versionado de N+1
// repos a un paquete privado.
// ============================================================

export type SubscriptionPlan = 'basico' | 'premium'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled'

/** Estado calculado: lo que la UI y el gate deben mirar. */
export type EffectiveState = 'active' | 'trial' | 'past_due' | 'blocked' | 'cancelled'

export interface RemoteSubscription {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_end: string | null
  grace_days: number
}

export interface SubscriptionState {
  effective: EffectiveState
  daysOverdue: number
  daysUntilBlock: number
  isBlocked: boolean
  needsWarning: boolean
}

export function normalizePlan(raw: string | null | undefined): SubscriptionPlan {
  return raw === 'premium' ? 'premium' : 'basico'
}

function diffDays(a: string, b: string): number {
  const msPerDay = 86_400_000
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / msPerDay)
}

/** Hoy en UTC como 'YYYY-MM-DD'. Alcanza para este panel: no necesita el
 * mismo huso al minuto que el gestor, solo que no ande atrasado un día. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function computeSubscriptionState(
  sub: RemoteSubscription | null,
  today: string = todayUTC()
): SubscriptionState {
  if (!sub) {
    return { effective: 'active', daysOverdue: 0, daysUntilBlock: 0, isBlocked: false, needsWarning: false }
  }

  if (sub.status === 'cancelled') {
    return { effective: 'cancelled', daysOverdue: 0, daysUntilBlock: 0, isBlocked: true, needsWarning: true }
  }

  if (!sub.current_period_end) {
    return {
      effective: sub.status === 'trial' ? 'trial' : 'active',
      daysOverdue: 0,
      daysUntilBlock: 0,
      isBlocked: false,
      needsWarning: false,
    }
  }

  const daysOverdue = diffDays(today, sub.current_period_end)

  if (daysOverdue <= 0) {
    return {
      effective: sub.status === 'trial' ? 'trial' : 'active',
      daysOverdue,
      daysUntilBlock: sub.grace_days - daysOverdue,
      isBlocked: false,
      needsWarning: daysOverdue > -5,
    }
  }

  if (daysOverdue <= sub.grace_days) {
    return {
      effective: 'past_due',
      daysOverdue,
      daysUntilBlock: sub.grace_days - daysOverdue,
      isBlocked: false,
      needsWarning: true,
    }
  }

  return { effective: 'blocked', daysOverdue, daysUntilBlock: 0, isBlocked: true, needsWarning: true }
}

export const EFFECTIVE_STATE_LABELS: Record<EffectiveState, string> = {
  active: 'Activo',
  trial: 'Prueba',
  past_due: 'Vencido (en gracia)',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
}

export const EFFECTIVE_STATE_COLORS: Record<EffectiveState, string> = {
  active: '#16a34a',
  trial: '#2563eb',
  past_due: '#d97706',
  blocked: '#dc2626',
  cancelled: '#6b7280',
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
