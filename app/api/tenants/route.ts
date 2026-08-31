import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { encryptSecret } from '@/lib/tenant-secret'

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: {
    nombre?: string
    slug?: string
    dominio?: string
    deploy_url?: string
    contacto_nombre?: string
    contacto_email?: string
    contacto_telefono?: string
    plan_actual?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const nombre = (body.nombre ?? '').trim()
  const slug = (body.slug ?? '').trim().toLowerCase()
  const dominio = (body.dominio ?? '').trim()
  const deployUrl = (body.deploy_url ?? '').trim().replace(/\/$/, '')
  const planActual = body.plan_actual === 'premium' ? 'premium' : 'basico'

  if (!nombre || !slug || !dominio || !deployUrl) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos (nombre, slug, dominio, deploy_url)' },
      { status: 400 }
    )
  }

  const secret = generateSecret()

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      nombre,
      slug,
      dominio,
      deploy_url: deployUrl,
      contacto_nombre: body.contacto_nombre?.trim() || null,
      contacto_email: body.contacto_email?.trim() || null,
      contacto_telefono: body.contacto_telefono?.trim() || null,
      plan_actual: planActual,
      ingest_secret_encrypted: encryptSecret(secret),
    })
    .select('id, nombre, slug')
    .single()

  if (error) {
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true, tenant: data, secret })
}
