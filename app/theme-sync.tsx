'use client'

import { useEffect } from 'react'

// Montado en el layout raíz para que "Sistema" quede realmente vivo: si el
// usuario no eligió tema a mano y cambia el modo claro/oscuro de su SO
// mientras el panel está abierto, se refleja al toque, sin recargar.
export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function syncIfNoOverride() {
      if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light')
      }
    }

    media.addEventListener('change', syncIfNoOverride)
    return () => media.removeEventListener('change', syncIfNoOverride)
  }, [])

  return null
}
