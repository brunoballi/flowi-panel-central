'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SecretReveal } from '../secret-reveal'

export default function NewTenantPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    dominio: '',
    deploy_url: '',
    contacto_nombre: '',
    contacto_email: '',
    contacto_telefono: '',
    plan_actual: 'basico',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Error creando el tenant')
      return
    }
    setSecret(data.secret)
  }

  if (secret) {
    return (
      <div className="mx-auto max-w-lg">
        <SecretReveal
          title="Tenant creado"
          secret={secret}
          envVarName="CONTROL_PLANE_INGEST_SECRET"
          onDone={() => router.push('/dashboard')}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Nuevo tenant</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <Field label="Nombre de la barbería" value={form.nombre} onChange={(v) => set('nombre', v)} required />
        <Field
          label="Slug (identificador único, ej: barberia-x)"
          value={form.slug}
          onChange={(v) => set('slug', v)}
          required
        />
        <Field
          label="Dominio (informativo, ej: app.cliente.com)"
          value={form.dominio}
          onChange={(v) => set('dominio', v)}
          required
        />
        <Field
          label="Deploy URL (base, para el pull, ej: https://app.cliente.com)"
          value={form.deploy_url}
          onChange={(v) => set('deploy_url', v)}
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Plan</label>
          <select
            value={form.plan_actual}
            onChange={(e) => set('plan_actual', e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="basico">Básico</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <Field label="Contacto — nombre" value={form.contacto_nombre} onChange={(v) => set('contacto_nombre', v)} />
        <Field
          label="Contacto — email"
          type="email"
          value={form.contacto_email}
          onChange={(v) => set('contacto_email', v)}
        />
        <Field
          label="Contacto — teléfono"
          value={form.contacto_telefono}
          onChange={(v) => set('contacto_telefono', v)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Crear tenant'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
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
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
    </div>
  )
}
