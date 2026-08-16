import type { CollectionConfig, Where } from 'payload'
import { getCurrentUser, isSuperAdminUser } from '@/utils/access/currentUser'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: {
    singular: 'Notification',
    plural: 'Notifications',
  },
  admin: {
    useAsTitle: 'type',
    group: 'Platform',
    defaultColumns: ['channel', 'type', 'status', 'sentAt'],
  },
  access: {
    read: ({ req }) => {
      const user = getCurrentUser(req)

      if (!user) {
        return false
      }

      if (isSuperAdminUser(req)) {
        return true
      }

      if (user.role === 'admin' || user.role === 'manager') {
        return true
      }

      return {
        userId: {
          equals: user.id,
        },
      }
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => isSuperAdminUser(req) || getCurrentUser(req)?.role === 'admin',
    delete: ({ req }) => isSuperAdminUser(req),
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      required: false,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'channel',
          type: 'select',
          required: true,
          options: ['whatsapp', 'email', 'in-app'],
        },
        {
          name: 'type',
          type: 'text',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: ['pending', 'queued', 'sent', 'failed'],
        },
      ],
    },
    {
      name: 'payload',
      type: 'json',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'sentAt',
          type: 'date',
          required: false,
        },
        {
          name: 'readAt',
          type: 'date',
          required: false,
          index: true,
          admin: {
            description: 'Set when the recipient opens the notification from the header bell.',
          },
        },
      ],
    },
  ],
  endpoints: [
    /**
     * Feed for the header notification bell: the signed-in user's own notifications
     * plus their unread count.
     */
    {
      path: '/mine',
      method: 'get',
      handler: async (req) => {
        const { payload, user } = req

        if (!user) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const requestedLimit = Number((req.query as Record<string, unknown>)?.limit)
        const limit =
          Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 10

        const mine: Where = { userId: { equals: user.id } }

        const [recent, unread] = await Promise.all([
          payload.find({
            collection: 'notifications',
            where: mine,
            sort: '-createdAt',
            limit,
            depth: 0,
            req,
            overrideAccess: false,
          }),
          payload.count({
            collection: 'notifications',
            where: {
              and: [mine, { readAt: { exists: false } }],
            },
            req,
            overrideAccess: false,
          }),
        ])

        return Response.json({
          docs: recent.docs.map((doc) => ({
            id: doc.id,
            channel: doc.channel,
            createdAt: doc.createdAt,
            payload: doc.payload,
            readAt: doc.readAt,
            sentAt: doc.sentAt,
            status: doc.status,
            type: doc.type,
          })),
          unreadCount: unread.totalDocs,
        })
      },
    },
    /**
     * Marks the given notifications (or every unread one) as read for the signed-in
     * user. Runs with `overrideAccess` because recipients are not granted write
     * access to the collection, but is hard-scoped to their own documents.
     */
    {
      path: '/mark-read',
      method: 'post',
      handler: async (req) => {
        const { payload, user } = req

        if (!user) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const body = req.json ? await req.json().catch(() => null) : null
        const ids = Array.isArray(body?.ids) ? body.ids : null

        const constraints: Where[] = [
          { userId: { equals: user.id } },
          { readAt: { exists: false } },
        ]

        if (ids) {
          if (!ids.length) {
            return Response.json({ updated: 0 }, { status: 200 })
          }

          constraints.push({ id: { in: ids } })
        }

        const result = await payload.update({
          collection: 'notifications',
          where: { and: constraints },
          data: {
            readAt: new Date().toISOString(),
          },
          depth: 0,
          req,
          overrideAccess: true,
        })

        return Response.json({ updated: result.docs?.length ?? 0 }, { status: 200 })
      },
    },
  ],
  timestamps: true,
}
