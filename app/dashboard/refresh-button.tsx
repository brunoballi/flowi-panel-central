'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid'

type Feedback = { kind: 'ok'; synced: number; failed: number } | { kind: 'error'; message: string } | null

export function RefreshButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleClick() {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/tenants/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error sincronizando')
      setFeedback({ kind: 'ok', synced: data.synced, failed: data.failed })
      router.refresh()
    } catch (err) {
      setFeedback({ kind: 'error', message: err instanceof Error ? err.message : 'Error sincronizando' })
    } finally {
      setLoading(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {feedback?.kind === 'ok' && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          Sincronizado {feedback.synced}/{feedback.synced + feedback.failed}
          {feedback.failed > 0 && ` (${feedback.failed} con error)`}
        </span>
      )}
      {feedback?.kind === 'error' && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <ExclamationCircleIcon className="h-4 w-4" aria-hidden="true" />
          {feedback.message}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        {loading ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
    </div>
  )
}
