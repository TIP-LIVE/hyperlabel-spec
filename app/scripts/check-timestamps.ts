import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  // Get the location events created by recent webhooks
  const prefixes = ['cmmujyt8','cmmujx9l','cmmufoyt','cmmufneo','cmmubdc2','cmmu74xs','cmmu73hw','cmmu2tg6','cmmtyk7q','cmmtubdy','cmmtlqb0','cmmtlq2n','cmmthhz9','cmmthhr8','cmmtd7mt','cmmtd6bn','cmmtd63g']

  console.log('Location events created by recent webhooks:')
  console.log('id       | recorded_at                              | received_at                              | source')
  console.log('-'.repeat(120))

  for (const prefix of prefixes) {
    const rows = await sql`SELECT id, recorded_at, received_at, source FROM location_events WHERE id LIKE ${prefix + '%'} LIMIT 1`
    if (rows[0]) {
      const r = rows[0]
      console.log(`${String(r.id).slice(0,8)} | ${r.recorded_at} | ${r.received_at} | ${r.source}`)
    } else {
      console.log(`${prefix} | NOT FOUND`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
