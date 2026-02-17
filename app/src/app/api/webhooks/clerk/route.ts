import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/admin-whitelist'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)
    const emailAddress = primaryEmail?.email_address || ''

    const data = {
      email: emailAddress,
      firstName: first_name || null,
      lastName: last_name || null,
      imageUrl: image_url || null,
      role: isAdminEmail(emailAddress) ? 'admin' : 'user' as const,
    }

    const existingByClerk = await db.user.findUnique({ where: { clerkId: id } })
    if (existingByClerk) {
      await db.user.update({ where: { clerkId: id }, data })
    } else {
      const existingByEmail = await db.user.findUnique({ where: { email: emailAddress } })
      if (existingByEmail) {
        await db.user.update({
          where: { id: existingByEmail.id },
          data: { clerkId: id, ...data },
        })
      } else {
        await db.user.create({ data: { clerkId: id, ...data } })
      }
    }

    console.log(`User created/updated: ${id} (${emailAddress})${isAdminEmail(emailAddress) ? ' [auto-admin]' : ''}`)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)
    const emailAddress = primaryEmail?.email_address || ''

    // Build update data — promote to admin if whitelisted, but never demote
    const updateData: Record<string, unknown> = {
      email: emailAddress,
      firstName: first_name || null,
      lastName: last_name || null,
      imageUrl: image_url || null,
    }

    if (isAdminEmail(emailAddress)) {
      updateData.role = 'admin'
    }

    await db.user.update({
      where: { clerkId: id },
      data: updateData,
    })

    console.log(`User updated: ${id} (${emailAddress})${isAdminEmail(emailAddress) ? ' [auto-admin]' : ''}`)
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (id) {
      await db.user.delete({
        where: { clerkId: id },
      })

      console.log(`User deleted: ${id}`)
    }
  }

  // ============================================
  // Organization Events
  // ============================================

  if (eventType === 'organization.created') {
    const { id, name, slug, created_by } = evt.data as {
      id: string
      name: string
      slug: string
      created_by: string
    }
    console.log(`Organization created: ${name} (${id}) by user ${created_by}, slug: ${slug}`)
  }

  if (eventType === 'organization.updated') {
    const { id, name, slug } = evt.data as { id: string; name: string; slug: string }
    console.log(`Organization updated: ${name} (${id}), slug: ${slug}`)
  }

  if (eventType === 'organization.deleted') {
    const { id } = evt.data as { id: string }
    if (id) {
      // Data remains in place — associated records keep their orgId for historical reference
      console.warn(`Organization deleted: ${id}. Associated data left in place for historical reference.`)
    }
  }

  if (eventType === 'organizationMembership.created') {
    const data = evt.data as {
      organization: { id: string; name: string }
      public_user_data: { user_id: string }
      role: string
    }
    console.log(
      `User ${data.public_user_data.user_id} joined org ${data.organization.name} (${data.organization.id}) as ${data.role}`
    )
  }

  if (eventType === 'organizationMembership.updated') {
    const data = evt.data as {
      organization: { id: string; name: string }
      public_user_data: { user_id: string }
      role: string
    }
    console.log(
      `User ${data.public_user_data.user_id} role updated to ${data.role} in org ${data.organization.name} (${data.organization.id})`
    )
  }

  if (eventType === 'organizationMembership.deleted') {
    const data = evt.data as {
      organization: { id: string; name: string }
      public_user_data: { user_id: string }
    }
    console.log(
      `User ${data.public_user_data.user_id} removed from org ${data.organization.name} (${data.organization.id})`
    )
    // Note: Their existing data remains in the org (they created it while a member).
    // This is standard B2B SaaS behavior.
  }

  return new Response('', { status: 200 })
}
