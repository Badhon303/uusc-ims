import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const run = async () => {
  const payload = await getPayload({ config })

  const plans = [
    { name: 'Trial', monthlyPrice: 0, currency: 'BDT', isActive: true },
    { name: 'Basic', monthlyPrice: 2500, currency: 'BDT', isActive: true },
  ]

  for (const plan of plans) {
    const existing = await payload.find({
      collection: 'subscription-plans' as never,
      where: {
        name: {
          equals: plan.name,
        },
      },
      limit: 1,
      depth: 0,
    } as any)

    if (!existing.docs.length) {
      await payload.create({
        collection: 'subscription-plans' as never,
        data: {
          ...plan,
          features: {
            maxCourts: 4,
            maxUsers: 25,
            tournamentsEnabled: true,
            whatsappNotificationsEnabled: true,
            reportsEnabled: true,
          },
        },
      } as any)
    }
  }

  const tenantFixtures = [
    {
      name: 'Indoor 1',
      slug: 'indoor-1',
      subscriptionStatus: 'trialing',
      trialOffsetDays: 7,
      adminEmail: 'admin1@example.com',
    },
    {
      name: 'Indoor 2',
      slug: 'indoor-2',
      subscriptionStatus: 'suspended',
      trialOffsetDays: -2,
      adminEmail: 'admin2@example.com',
    },
  ]

  for (const fixture of tenantFixtures) {
    const existingTenant = await payload.find({
      collection: 'tenants' as never,
      where: {
        slug: {
          equals: fixture.slug,
        },
      },
      limit: 1,
      depth: 0,
    } as any)

    const now = new Date()
    const trialEndsAt = new Date(now)
    trialEndsAt.setDate(trialEndsAt.getDate() + fixture.trialOffsetDays)

    const tenant =
      existingTenant.docs[0] ||
      (await payload.create({
        collection: 'tenants' as never,
        data: {
          name: fixture.name,
          slug: fixture.slug,
          subscriptionStatus: fixture.subscriptionStatus,
          trialStartedAt: now,
          trialEndsAt,
          gracePeriodDays: 3,
          nextBillingDate: trialEndsAt,
          autoSuspendOnExpiry: true,
          timezone: 'Asia/Dhaka',
          currency: 'BDT',
          isActive: true,
        },
      } as any))

    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: fixture.adminEmail,
        },
      },
      limit: 1,
      depth: 0,
    })

    if (!existingUser.docs.length) {
      await payload.create({
        collection: 'users',
        data: {
          name: `${fixture.name} Admin`,
          email: fixture.adminEmail,
          password: 'Password123!',
          role: 'admin',
          tenants: [{ tenant: tenant.id }],
          tenantSubscriptionStatus: fixture.subscriptionStatus,
        },
      } as any)
    }

    const existingCourt = await payload.find({
      collection: 'courts',
      where: {
        and: [
          {
            tenant: {
              equals: tenant.id,
            },
          },
          {
            name: {
              equals: 'Court 1',
            },
          },
        ],
      },
      limit: 1,
      depth: 0,
    } as any)

    if (!existingCourt.docs.length) {
      await payload.create({
        collection: 'courts',
        data: {
          name: 'Court 1',
          peakHourPrice: 1000,
          normalHourPrice: 800,
          tenant: tenant.id,
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
