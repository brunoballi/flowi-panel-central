'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/20/solid'

type Theme = 'system' | 'light' | 'dark'

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'system', label: 'Sistema', icon: ComputerDesktopIcon },
  { value: 'light', label: 'Claro', icon: SunIcon },
  { value: 'dark', label: 'Oscuro', icon: MoonIcon },
]

export function ThemeToggle() {
  // Arranca en 'system' hasta que el efecto lea localStorage — el <html>
  // real ya tiene el tema correcto aplicado por el script inline de
  // app/layout.tsx, esto solo sincroniza qué botón se ve marcado.
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    // Sync único al montar, leyendo un sistema externo (localStorage) — es
    // exactamente el caso que la regla del lint permite en su descripción,
    // pero igual la marca por llamarse "directo" y no en un callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'light' || stored === 'dark') setTheme(stored)
  }, [])

  function apply(value: Theme) {
    setTheme(value)
    if (value === 'system') {
      localStorage.removeItem('theme')
      // data-theme se deja en un valor concreto igual — ver comentario en
      // app/layout.tsx — solo que ahora "concreto" significa "lo que diga
      // el SO ahora mismo", y ThemeSync lo mantiene al día si cambia.
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light')
    } else {
      localStorage.setItem('theme', value)
      document.documentElement.setAttribute('data-theme', value)
    }
  }

  return (
    <div className="flex items-center rounded-md border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`Tema ${label.toLowerCase()}`}
          aria-pressed={theme === value}
          title={label}
          onClick={() => apply(value)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            theme === value
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
