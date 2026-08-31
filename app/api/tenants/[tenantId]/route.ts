import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { encryptSecret } from '@/lib/tenant-secret'

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: {
    nombre?: string
    dominio?: string
    deploy_url?: string
    contacto_nombre?: string
    contacto_email?: string
    contacto_telefono?: string
    plan_actual?: string
    activo?: boolean
    rotate_secret?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined) update.nombre = body.nombre.trim()
  if (body.dominio !== undefined) update.dominio = body.dominio.trim()
  if (body.deploy_url !== undefined) update.deploy_url = body.deploy_url.trim().replace(/\/$/, '')
  if (body.contacto_nombre !== undefined) update.contacto_nombre = body.contacto_nombre.trim() || null
  if (body.contacto_email !== undefined) update.contacto_email = body.contacto_email.trim() || null
  if (body.contacto_telefono !== undefined) update.contacto_telefono = body.contacto_telefono.trim() || null
  if (body.plan_actual !== undefined) update.plan_actual = body.plan_actual === 'premium' ? 'premium' : 'basico'
  if (body.activo !== undefined) update.activo = Boolean(body.activo)

  let newSecret: string | null = null
  if (body.rotate_secret) {
    newSecret = generateSecret()
    update.ingest_secret_encrypted = encryptSecret(newSecret)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }

  const { error } = await supabase.from('tenants').update(update).eq('id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, secret: newSecret })
}
