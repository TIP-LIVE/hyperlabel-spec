import { db } from './db'
import type { LabelPack } from '@prisma/client'

export type LabelPackKey = 'starter' | 'team' | 'volume'

export interface LabelPackDisplay {
  key: string
  name: string
  description: string
  labels: number
  price: number
  perLabel: number
  savings: number
  popular: boolean
}

const DEFAULT_PACKS: Array<Pick<LabelPack, 'key' | 'name' | 'description' | 'quantity' | 'priceCents' | 'popular'>> = [
  { key: 'starter', name: '1 Label', description: 'Try it out', quantity: 1, priceCents: 2500, popular: false },
  { key: 'team', name: '5 Labels', description: 'Most popular', quantity: 5, priceCents: 11000, popular: true },
  { key: 'volume', name: '10 Labels', description: 'Best price per label', quantity: 10, priceCents: 20000, popular: false },
]

export async function ensureDefaultPacks(): Promise<void> {
  for (const pack of DEFAULT_PACKS) {
    await db.labelPack.upsert({
      where: { key: pack.key },
      update: {},
      create: pack,
    })
  }
}

export async function getLabelPacks(): Promise<LabelPack[]> {
  const rows = await db.labelPack.findMany({ orderBy: { quantity: 'asc' } })
  if (rows.length === 0) {
    await ensureDefaultPacks()
    return db.labelPack.findMany({ orderBy: { quantity: 'asc' } })
  }
  return rows
}

export async function getLabelPack(key: string): Promise<LabelPack | null> {
  return db.labelPack.findUnique({ where: { key } })
}

/** Returns the cheapest per-label price in whole dollars, used by "From $X" marketing copy. */
export async function getCheapestPerLabel(): Promise<number> {
  const packs = await getLabelPacks()
  if (packs.length === 0) return 20
  const cheapestCents = Math.min(...packs.map((p) => p.priceCents / p.quantity))
  return cheapestCents / 100
}

export function toDisplayPacks(packs: LabelPack[]): LabelPackDisplay[] {
  const starter = packs.find((p) => p.quantity === 1)
  const baseCents = starter?.priceCents ?? 2500
  return packs.map((p) => {
    const savingsCents = Math.max(0, baseCents * p.quantity - p.priceCents)
    return {
      key: p.key,
      name: p.name,
      description: p.description,
      labels: p.quantity,
      price: p.priceCents / 100,
      perLabel: p.priceCents / p.quantity / 100,
      savings: savingsCents / 100,
      popular: p.popular,
    }
  })
}
