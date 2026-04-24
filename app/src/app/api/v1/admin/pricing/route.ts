import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureDefaultPacks } from '@/lib/pricing'
import { z } from 'zod'

const updateSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  priceCents: z.number().int().min(0).max(10_000_00), // up to $10,000
  popular: z.boolean().optional(),
})

export async function GET() {
  await requireAdmin()
  await ensureDefaultPacks()
  const packs = await db.labelPack.findMany({ orderBy: { quantity: 'asc' } })
  return NextResponse.json({ packs })
}

export async function PUT(req: NextRequest) {
  await requireAdmin()

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { key, name, description, priceCents, popular } = parsed.data

  const existing = await db.labelPack.findUnique({ where: { key } })
  if (!existing) {
    return NextResponse.json({ error: `Pack "${key}" not found` }, { status: 404 })
  }

  if (popular === true) {
    const [, updated] = await db.$transaction([
      db.labelPack.updateMany({
        where: { key: { not: key } },
        data: { popular: false },
      }),
      db.labelPack.update({
        where: { key },
        data: { name, description, priceCents, popular: true },
      }),
    ])
    return NextResponse.json({ pack: updated })
  }

  const updated = await db.labelPack.update({
    where: { key },
    data: { name, description, priceCents, popular: popular ?? false },
  })
  return NextResponse.json({ pack: updated })
}
