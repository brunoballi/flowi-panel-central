import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { EditTenantForm } from './edit-form'

export default async function EditTenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const supabase = await createSupabaseServerClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, nombre, slug, dominio, deploy_url, contacto_nombre, contacto_email, contacto_telefono, plan_actual, activo')
    .eq('id', tenantId)
    .single()

  if (!tenant) notFound()

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Editar tenant</h1>
      <EditTenantForm tenant={tenant} />
    </div>
  )
}
