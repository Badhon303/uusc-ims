import type { PayloadRequest, TaskConfig } from 'payload'
import { addDays, getPlatformSettings, resolveRelationshipId } from '@/utils/subscriptions'

/**
 * Runs daily and queues an email Notification for every tenant admin whose trial or
 * next billing date falls within the platform's reminder window. Deduplicates by
 * encoding the deadline's date into the notification `type`, so re-running this job
 * on the same day is a no-op for tenants that were already reminded.
 */
const sendBillingRemindersTask = {
  slug: 'sendBillingReminders',
  retries: 2,
  schedule: [
    {
      cron: '0 8 * * *', // every day at 08:00
      queue: 'billing',
    },
  ],
  handler: async ({ req }: { req: PayloadRequest }) => {
    const payload = req.payload
    const settings = await getPlatformSettings(req)
    const reminderDays = Number(settings.billingReminderDaysBefore || 3)
    const now = new Date()
    const windowEnd = addDays(now, reminderDays)

    const { docs: tenants } = await payload.find({
      collection: 'tenants' as never,
      where: {
        or: [
          {
            trialEndsAt: {
              greater_than_equal: now.toISOString(),
              less_than_equal: windowEnd.toISOString(),
            },
          },
          {
            nextBillingDate: {
              greater_than_equal: now.toISOString(),
              less_than_equal: windowEnd.toISOString(),
            },
          },
        ],
      },
      limit: 500,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    } as any)

    let remindersSent = 0

    for (const tenant of tenants as any[]) {
      const tenantId = resolveRelationshipId(tenant.id)
      const deadline = tenant.trialEndsAt || tenant.nextBillingDate

      if (!tenantId || !deadline) {
        continue
      }

      const reminderType = `billing-reminder-${new Date(deadline).toISOString().slice(0, 10)}`

      const { docs: users } = await payload.find({
        collection: 'users',
        where: {
          'tenants.tenant': {
            equals: tenantId,
          },
        },
        limit: 50,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })

      if (!users.length) {
        continue
      }

      const userIds = users.map((u: any) => u.id)

      // Single query: find all users that already have this reminder type, so
      // we can skip them in one shot instead of one query per user.
      const { docs: existingReminders } = await payload.find({
        collection: 'notifications' as never,
        where: {
          and: [{ type: { equals: reminderType } }, { userId: { in: userIds } }],
        },
        limit: userIds.length,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        select: { userId: true },
      } as any)

      const alreadyReminded = new Set(
        existingReminders.map((n: any) => resolveRelationshipId(n.userId)),
      )

      const toCreate = users.filter((u: any) => !alreadyReminded.has(u.id))

      for (const user of toCreate) {
        await payload.create({
          collection: 'notifications' as never,
          data: {
            userId: user.id,
            tenant: tenantId,
            channel: 'email',
            type: reminderType,
            status: 'pending',
            payload: {
              subject: 'Your subscription is ending soon',
              tenantName: tenant.name,
              deadline,
            },
          },
          overrideAccess: true,
          req,
        } as any)

        remindersSent++
      }
    }

    return {
      output: {
        tenantsChecked: tenants.length,
        remindersSent,
      },
    }
  },
}

export const SendBillingReminders = sendBillingRemindersTask as unknown as TaskConfig
