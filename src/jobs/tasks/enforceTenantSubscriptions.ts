import type { PayloadRequest, TaskConfig } from 'payload'
import { addDays, getTenantBillingSettings, resolveRelationshipId } from '@/utils/subscriptions'

/**
 * Runs on a schedule (see payload.config.ts) and transitions tenants whose trial or
 * billing period has expired:
 *   trialing/active -> past_due (once the deadline passes)
 *   past_due -> suspended (once the grace period also passes)
 *
 * Reuses the existing Tenants collection hooks (subscription event logging, user
 * subscription-status sync) by going through payload.update() instead of writing
 * directly to the database.
 */
const enforceTenantSubscriptionsTask = {
  slug: 'enforceTenantSubscriptions',
  retries: 2,
  schedule: [
    {
      cron: '0 * * * *', // every hour
      queue: 'billing',
    },
  ],
  handler: async ({ req }: { req: PayloadRequest }) => {
    const payload = req.payload
    const now = new Date()

    const { docs: tenants } = await payload.find({
      collection: 'tenants' as never,
      where: {
        subscriptionStatus: {
          in: ['trialing', 'past_due'],
        },
        autoSuspendOnExpiry: {
          equals: true,
        },
      },
      limit: 500,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    } as any)

    let pastDueCount = 0
    let suspendedCount = 0

    for (const tenant of tenants as any[]) {
      const deadline = tenant.trialEndsAt || tenant.nextBillingDate

      if (!deadline) {
        continue
      }

      const graceDays = Number(tenant.gracePeriodDays ?? 3)
      const graceDeadline = addDays(new Date(deadline), graceDays)

      if (now <= new Date(deadline)) {
        continue
      }

      if (now <= graceDeadline) {
        if (tenant.subscriptionStatus !== 'past_due') {
          await payload.update({
            collection: 'tenants' as never,
            id: resolveRelationshipId(tenant.id) as any,
            data: { subscriptionStatus: 'past_due' },
            overrideAccess: true,
            req,
          } as any)
          pastDueCount++
        }
        continue
      }

      await payload.update({
        collection: 'tenants' as never,
        id: resolveRelationshipId(tenant.id) as any,
        data: {
          subscriptionStatus: 'suspended',
          suspendedReason: 'Auto-suspended: trial/grace period expired without payment',
        },
        overrideAccess: true,
        req,
      } as any)
      suspendedCount++
    }

    return {
      output: {
        checked: tenants.length,
        markedPastDue: pastDueCount,
        suspended: suspendedCount,
      },
    }
  },
}

export const EnforceTenantSubscriptions = enforceTenantSubscriptionsTask as unknown as TaskConfig
