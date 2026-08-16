import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const tenantScopedCollections = [
  'members',
  'students',
  'coaches',
  'managers',
  'staffs',
  'courts',
  'court-bookings',
  'training-groups',
  'training-schedules',
  'member-schedules',
  'student-attendance',
  'student-progress',
  'packages',
  'member-payments',
  'student-payments',
  'booking-payments',
  'tournaments',
  'tournament-registrations',
  'tournament-teams',
  'tournament-matches',
  'tournament-results',
  'expenditures',
  'other-incomes',
  'coach-salaries',
  'sponsors',
] as const

const run = async () => {
  const payload = await getPayload({ config })

  const slug = process.env.DEFAULT_TENANT_SLUG || 'indoor-1'
  const name = process.env.DEFAULT_TENANT_NAME || 'Indoor 1'

  const existing = await payload.find({
    collection: 'tenants' as never,
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    depth: 0,
  } as any)

  const tenant =
    existing.docs[0] ||
    (await payload.create({
      collection: 'tenants' as never,
      data: {
        name,
        slug,
        subscriptionStatus: 'active',
        timezone: 'Asia/Dhaka',
        currency: 'BDT',
        isActive: true,
        autoSuspendOnExpiry: true,
      },
    } as any))

  const tenantId = tenant.id

  const usersResult = await payload.find({
    collection: 'users',
    limit: 500,
    depth: 0,
    pagination: false,
  })

  for (const user of usersResult.docs as any[]) {
    if (user.isSuperAdmin || (Array.isArray(user.tenants) && user.tenants.length)) {
      continue
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        tenants: [{ tenant: tenantId }],
      },
    })
  }

  for (const collection of tenantScopedCollections) {
    const result = await payload.find({
      collection: collection as never,
      limit: 500,
      depth: 0,
      pagination: false,
    } as any)

    for (const doc of result.docs as any[]) {
      if (doc.tenant) {
        continue
      }

      await payload.update({
        collection: collection as never,
        id: doc.id,
        data: {
          tenant: tenantId,
        },
      } as any)
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
