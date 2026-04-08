import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

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

// ============================================================================
// Label provisioning (factory scan flow)
// ============================================================================

export type ProvisionLabelErrorCode = 'INVALID_IMEI' | 'DUPLICATE_IMEI'

export class ProvisionLabelError extends Error {
  constructor(
    message: string,
    public code: ProvisionLabelErrorCode,
    public existingLabel?: {
      id: string
      displayId: string | null
      imei: string | null
    }
  ) {
    super(message)
    this.name = 'ProvisionLabelError'
  }
}

export interface ProvisionedLabel {
  id: string
  deviceId: string
  displayId: string
  imei: string
  counter: number
  firmwareVersion: string | null
  createdAt: Date
}

const MAX_PROVISION_RETRIES = 3

/**
 * Create a single label row from scanned modem data.
 *
 * Flow:
 *  1. Validate IMEI format (15 digits).
 *  2. Pre-check for duplicate IMEI — fail fast with the existing label's info.
 *  3. In a transaction: allocate next counter → compute displayId → create row
 *     with `deviceId = displayId`, `status: INVENTORY`.
 *  4. Retry up to 3 times on Prisma P2002 against the `counter` unique key
 *     (MAX+1 allocation is theoretically racy under concurrency).
 *
 * Called from `POST /api/v1/admin/labels/provision`.
 */
export async function provisionLabel(params: {
  imei: string
  firmwareVersion?: string | null
}): Promise<ProvisionedLabel> {
  const imei = params.imei.trim()
  if (!/^\d{15}$/.test(imei)) {
    throw new ProvisionLabelError(
      `IMEI must be exactly 15 digits, got "${imei}"`,
      'INVALID_IMEI'
    )
  }

  // Pre-check for duplicates so we can return rich error info to the client.
  // The @unique constraint on imei is the authoritative safety net.
  const duplicate = await db.label.findUnique({
    where: { imei },
    select: { id: true, displayId: true, imei: true },
  })
  if (duplicate) {
    throw new ProvisionLabelError(
      `Label already exists for IMEI ${imei}`,
      'DUPLICATE_IMEI',
      duplicate
    )
  }

  const firmwareVersion = params.firmwareVersion ?? null

  for (let attempt = 0; attempt < MAX_PROVISION_RETRIES; attempt++) {
    try {
      const created = await db.$transaction(async (tx) => {
        const counter = await allocateNextCounter(tx)
        const displayId = formatDisplayId(counter, imei)
        if (!displayId) {
          // Should be unreachable — we already validated the IMEI.
          throw new Error(
            `Failed to compute displayId for counter=${counter} imei=${imei}`
          )
        }

        return tx.label.create({
          data: {
            deviceId: displayId,
            counter,
            displayId,
            imei,
            firmwareVersion,
            status: 'INVENTORY',
          },
          select: {
            id: true,
            deviceId: true,
            displayId: true,
            imei: true,
            counter: true,
            firmwareVersion: true,
            createdAt: true,
          },
        })
      })

      // All selected fields are guaranteed non-null because we just wrote them.
      return {
        id: created.id,
        deviceId: created.deviceId,
        displayId: created.displayId!,
        imei: created.imei!,
        counter: created.counter!,
        firmwareVersion: created.firmwareVersion,
        createdAt: created.createdAt,
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta?.target as string[])
          : typeof err.meta?.target === 'string'
            ? [err.meta.target as string]
            : []

        // A concurrent provision stole our counter — retry.
        if (target.includes('counter')) {
          if (attempt < MAX_PROVISION_RETRIES - 1) continue
          throw new Error('Counter allocation failed after retries')
        }

        // Someone inserted a row with this IMEI between our pre-check and the
        // transaction commit — surface as DUPLICATE_IMEI.
        if (target.includes('imei')) {
          const existing = await db.label.findUnique({
            where: { imei },
            select: { id: true, displayId: true, imei: true },
          })
          throw new ProvisionLabelError(
            `Label already exists for IMEI ${imei}`,
            'DUPLICATE_IMEI',
            existing ?? undefined
          )
        }

        // Any other unique-key conflict — unexpected, bubble up.
      }
      throw err
    }
  }

  // Loop should always return or throw; this satisfies the type checker.
  throw new Error('Counter allocation failed after retries')
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
