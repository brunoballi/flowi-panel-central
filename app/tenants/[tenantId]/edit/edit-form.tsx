'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SecretReveal } from '../../secret-reveal'

interface Tenant {
  id: string
  nombre: string
  slug: string
  dominio: string
  deploy_url: string
  contacto_nombre: string | null
  contacto_email: string | null
  contacto_telefono: string | null
  plan_actual: string
  activo: boolean
}

export function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: tenant.nombre,
    dominio: tenant.dominio,
    deploy_url: tenant.deploy_url,
    contacto_nombre: tenant.contacto_nombre ?? '',
    contacto_email: tenant.contacto_email ?? '',
    contacto_telefono: tenant.contacto_telefono ?? '',
    plan_actual: tenant.plan_actual,
    activo: tenant.activo,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error')
    return data
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await patch(form)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando')
    } finally {
      setLoading(false)
    }
  }

  async function handleRotate() {
    if (!confirm('Esto invalida el secreto anterior. El cliente va a necesitar cargar el nuevo en Vercel. ¿Continuar?')) {
      return
    }
    setRotating(true)
    setError(null)
    try {
      const data = await patch({ rotate_secret: true })
      setNewSecret(data.secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error rotando el secreto')
    } finally {
      setRotating(false)
    }
  }

  if (newSecret) {
    return (
      <SecretReveal
        title="Secreto rotado"
        secret={newSecret}
        envVarName="CONTROL_PLANE_INGEST_SECRET"
        onDone={() => router.push('/dashboard')}
      />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Field label="Nombre" value={form.nombre} onChange={(v) => set('nombre', v)} required />
      <Field label="Dominio" value={form.dominio} onChange={(v) => set('dominio', v)} required />
      <Field label="Deploy URL" value={form.deploy_url} onChange={(v) => set('deploy_url', v)} required />
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Plan</label>
        <select
          value={form.plan_actual}
          onChange={(e) => set('plan_actual', e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="basico">Básico</option>
          <option value="premium">Premium</option>
        </select>
      </div>
      <Field label="Contacto — nombre" value={form.contacto_nombre} onChange={(v) => set('contacto_nombre', v)} />
      <Field label="Contacto — email" type="email" value={form.contacto_email} onChange={(v) => set('contacto_email', v)} />
      <Field label="Contacto — teléfono" value={form.contacto_telefono} onChange={(v) => set('contacto_telefono', v)} />

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" checked={form.activo} onChange={(e) => set('activo', e.target.checked)} />
        Tenant activo (se excluye de la sincronización si se destilda)
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={handleRotate}
          disabled={rotating}
          className="cursor-pointer rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950"
        >
          {rotating ? 'Rotando…' : 'Rotar secreto de ingesta'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  )
}
