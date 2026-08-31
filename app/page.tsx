import { redirect } from 'next/navigation'

// El middleware ya manda a /login a quien no tenga sesión; acá solo hace
// falta resolver "/" hacia el dashboard para quien sí la tenga.
export default function Home() {
  redirect('/dashboard')
}
