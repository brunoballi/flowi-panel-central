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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Este secreto se muestra <strong>una sola vez</strong>. Copialo y cargalo como variable de entorno{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">{envVarName}</code> en el Vercel del
        cliente (Production).
      </p>
      <div className="mb-4 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {secret}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 cursor-pointer rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="cursor-pointer rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Ya lo guardé, continuar
      </button>
    </div>
  )
}
