import type { PayloadRequest, TaskConfig } from 'payload'
import { resolveRelationshipId } from '@/utils/subscriptions'

/**
 * Runs frequently and delivers queued Notification documents.
 *
 * - `email` channel: sent via the configured Payload email adapter (nodemailer).
 * - `whatsapp` / `in-app` channels: no external provider is wired up yet. They are
 *   marked as sent so the in-app notification center can read them directly from the
 *   database; wire up a real provider here when one is available.
 */
const dispatchPendingNotificationsTask = {
  slug: 'dispatchPendingNotifications',
  retries: 3,
  schedule: [
    {
      cron: '*/5 * * * *', // every 5 minutes
      queue: 'notifications',
    },
  ],
  handler: async ({ req }: { req: PayloadRequest }) => {
    const payload = req.payload

    const { docs: notifications } = await payload.find({
      collection: 'notifications' as never,
      where: {
        status: {
          in: ['pending', 'queued'],
        },
      },
      limit: 100,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    } as any)

    // Batch-fetch all recipient users in a single query instead of one
    // findByID per email notification.
    const emailUserIds = (notifications as any[])
      .filter((n) => n.channel === 'email')
      .map((n) => resolveRelationshipId(n.userId))
      .filter((id): id is number | string => id !== null)

    const userMap = new Map<number | string, { email?: string }>()

    if (emailUserIds.length) {
      const { docs: users } = await payload.find({
        collection: 'users',
        where: {
          id: { in: emailUserIds },
        },
        limit: emailUserIds.length,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        select: { email: true },
      })

      for (const u of users as any[]) {
        userMap.set(u.id, { email: u.email })
      }
    }

    let sent = 0
    let failed = 0

    for (const notification of notifications as any[]) {
      const notificationId = resolveRelationshipId(notification.id)

      try {
        if (notification.channel === 'email') {
          const userId = resolveRelationshipId(notification.userId)

          if (!userId) {
            throw new Error('Notification has no recipient user')
          }

          const user = userMap.get(userId)

          if (!user?.email) {
            throw new Error('Recipient user has no email on file')
          }

          await payload.sendEmail({
            to: user.email,
            subject: notification.payload?.subject || notification.type,
            html:
              notification.payload?.html ||
              `<p>${notification.payload?.message || notification.type}</p>`,
          })
        } else {
          payload.logger.info(
            `[notifications] ${notification.channel} delivery is not yet integrated; marking notification ${notificationId} as sent`,
          )
        }

        await payload.update({
          collection: 'notifications' as never,
          id: notificationId as any,
          data: {
            status: 'sent',
            sentAt: new Date().toISOString(),
          },
          overrideAccess: true,
          req,
        } as any)

        sent++
      } catch (err) {
        payload.logger.error(err)

        await payload.update({
          collection: 'notifications' as never,
          id: notificationId as any,
          data: {
            status: 'failed',
          },
          overrideAccess: true,
          req,
        } as any)

        failed++
      }
    }

    return {
      output: {
        processed: notifications.length,
        sent,
        failed,
      },
    }
  },
}

export const DispatchPendingNotifications =
  dispatchPendingNotificationsTask as unknown as TaskConfig
