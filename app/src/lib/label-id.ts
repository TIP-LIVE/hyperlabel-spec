import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * User-facing label identifier: 5-digit sequential counter + last 4 of IMEI.
 * Example: counter=42, imei="868719074243326" → "000423326"
 *
 * Null until both counter and imei are known.
 */
export function formatDisplayId(
  counter: number | null | undefined,
  imei: string | null | undefined
): string | null {
  if (counter == null || !imei || imei.length < 4) return null
  if (counter < 0 || counter > 99999) return null
  return counter.toString().padStart(5, '0') + imei.slice(-4)
}

/** True if the string looks like a new-format displayId (9 digits). */
export function isDisplayId(value: string): boolean {
  return /^\d{9}$/.test(value)
}

/**
 * Allocate the next sequential counter atomically.
 * Uses MAX(counter)+1 inside the caller's transaction.
 * Call this only from inside `db.$transaction(async (tx) => { ... })`.
 */
export async function allocateNextCounter(
  tx: Prisma.TransactionClient
): Promise<number> {
  const max = await tx.label.aggregate({ _max: { counter: true } })
  return (max._max.counter ?? 0) + 1
}

/**
 * Assign IMEI to a label, routing through a single place so displayId stays
 * in sync. If the label has a counter but no displayId, compute and persist it.
 */
export async function setLabelImei(labelId: string, imei: string): Promise<void> {
  const label = await db.label.findUnique({
    where: { id: labelId },
    select: { counter: true, imei: true, displayId: true },
  })
  if (!label) return
  if (label.imei === imei && label.displayId) return

  const nextDisplayId = formatDisplayId(label.counter, imei)
  try {
    await db.label.update({
      where: { id: labelId },
      data: {
        imei,
        ...(nextDisplayId ? { displayId: nextDisplayId } : {}),
      },
    })
  } catch (err) {
    // Unique-constraint race — safe to ignore, dedup will resolve later
    console.warn('[label-id] setLabelImei failed', { labelId, error: err })
  }
}

/**
 * Resolve a label by either legacy deviceId or new displayId.
 * Handles the w-prefix lowercase vs TIP-XXX uppercase quirk.
 */
export async function findLabelByAnyId<T extends Prisma.LabelInclude>(
  value: string,
  include?: T
) {
  const v = value.trim()
  const variants = new Set<string>([v])
  // TIP-001 / HL-001234 are stored uppercase
  variants.add(v.toUpperCase())
  // w17246198247 is stored lowercase
  if (/^w\d/i.test(v)) variants.add(v.toLowerCase())

  const deviceIdList = Array.from(variants)

  return db.label.findFirst({
    where: {
      OR: [{ deviceId: { in: deviceIdList } }, { displayId: v }],
    },
    ...(include ? { include } : {}),
  })
}
