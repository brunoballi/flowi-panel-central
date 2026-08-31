import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente Supabase atado a la sesión del usuario logueado (Server Components / Server Actions / route handlers con cookies). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Se llama desde un Server Component sin permiso de escritura; el
            // middleware ya se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    }
  )
}
