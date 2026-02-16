/**
 * One-time migration: move Label.orderId to OrderLabel join table,
 * then drop labels.order_id. Run BEFORE `npx prisma db push` after pulling
 * the schema that has OrderLabel and no Label.orderId.
 *
 * Usage: npx tsx scripts/migrate-label-order-many-to-many.ts
 */

import 'dotenv/config'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL required')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function migrate() {
  console.log('Checking current schema...')

  // Check if order_labels already exists (idempotent)
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'order_labels'
    )
  `)
  if (tableCheck.rows[0].exists) {
    console.log('order_labels already exists. Skipping migration.')
    return
  }

  // Check if labels still has order_id
  const columnCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'labels' AND column_name = 'order_id'
    )
  `)
  if (!columnCheck.rows[0].exists) {
    console.log('labels.order_id already dropped. Skipping migration.')
    return
  }

  console.log('Creating order_labels table...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "order_labels" (
      "order_id" TEXT NOT NULL,
      "label_id" TEXT NOT NULL,
      CONSTRAINT "order_labels_order_id_label_id_pkey" PRIMARY KEY ("order_id", "label_id"),
      CONSTRAINT "order_labels_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
      CONSTRAINT "order_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE
    )
  `)

  console.log('Creating org_settings table...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "org_settings" (
      "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
      "org_id" TEXT NOT NULL,
      "allow_labels_in_multiple_orgs" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "org_settings_org_id_key" UNIQUE ("org_id")
    )
  `)

  console.log('Copying label->order links into order_labels...')
  const copy = await pool.query(`
    INSERT INTO "order_labels" ("order_id", "label_id")
    SELECT "order_id", "id" FROM "labels" WHERE "order_id" IS NOT NULL
    ON CONFLICT DO NOTHING
  `)
  console.log(`Inserted ${copy.rowCount ?? 0} rows into order_labels.`)

  console.log('Dropping FK and column order_id from labels...')
  await pool.query(`ALTER TABLE "labels" DROP CONSTRAINT IF EXISTS "labels_order_id_fkey"`)
  await pool.query(`ALTER TABLE "labels" DROP COLUMN IF EXISTS "order_id"`)

  console.log('Migration complete.')
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
