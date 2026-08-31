'use client'

import { useState } from 'react'

export function SecretReveal({
  title,
  secret,
  envVarName,
  onDone,
}: {
  title: string
  secret: string
  envVarName: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mb-4 text-sm text-zinc-600">
        Este secreto se muestra <strong>una sola vez</strong>. Copialo y cargalo como variable de entorno{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs">{envVarName}</code> en el Vercel del cliente
        (Production).
      </p>
      <div className="mb-4 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs">
          {secret}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Ya lo guardé, continuar
      </button>
    </div>
  )
}
