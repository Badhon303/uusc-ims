import type { CollectionConfig } from 'payload'
import { getCurrentUser, getTenantIdFromUser } from '@/utils/access/currentUser'
import { resolveRelationshipId } from '@/utils/subscriptions'

export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: {
    singular: '😋 Payment',
    plural: '😋 Payments',
  },
  admin: {
    useAsTitle: 'invoiceNumber',
    group: '💳 Payments & Packages',
    defaultColumns: ['invoiceNumber', 'payerType', 'amount', 'status', 'dueDate', 'paidAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      const role = getCurrentUser(req)?.role
      return role === 'admin' || role === 'manager' || role === 'staff'
    },
    delete: ({ req }) => getCurrentUser(req)?.role === 'admin',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'payerType',
          type: 'select',
          required: true,
          options: ['member', 'student', 'guest'],
        },
        {
          name: 'payer',
          type: 'relationship',
          relationTo: ['members', 'students', 'users'],
          required: false,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'context',
          type: 'select',
          required: true,
          options: ['membership', 'registration-fee', 'court-booking', 'tournament-fee'],
        },
        {
          name: 'contextRefId',
          type: 'text',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'paymentMethod',
          type: 'select',
          required: true,
          options: ['cash', 'bkash', 'nagad', 'sslcommerz', 'card'],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: ['pending', 'paid', 'failed', 'refunded', 'due'],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gatewayTransactionId',
          type: 'text',
        },
        {
          name: 'gatewayStatus',
          type: 'text',
        },
        {
          name: 'invoiceNumber',
          type: 'text',
          unique: true,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dueDate',
          type: 'date',
        },
        {
          name: 'paidAt',
          type: 'date',
        },
        {
          name: 'deletedAt',
          type: 'date',
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        const nextData = (data ?? {}) as any

        if (operation !== 'create' || nextData.invoiceNumber) {
          return nextData
        }

        const tenantId = resolveRelationshipId(nextData.tenant) || getTenantIdFromUser(req)

        const counter = await req.payload.find({
          collection: 'payments' as never,
          where: tenantId
            ? {
                tenant: {
                  equals: tenantId,
                },
              }
            : undefined,
          limit: 1,
          sort: '-createdAt',
          depth: 0,
          req,
          overrideAccess: false,
        } as any)

        const nextNumber = (counter.totalDocs || 0) + 1
        const tenantPrefix = tenantId ? String(tenantId) : 'GLOBAL'
        nextData.invoiceNumber = `PAY-${tenantPrefix}-${String(nextNumber).padStart(6, '0')}`

        return nextData
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (previousDoc?.status === 'paid' || doc.status !== 'paid') {
          return doc
        }

        await req.payload.create({
          collection: 'other-incomes',
          data: {
            title: `${doc.context || 'payment'}:${doc.invoiceNumber}`,
            amount: doc.amount,
            date: doc.paidAt || new Date(),
            description: `Auto-created from payment ${doc.invoiceNumber}`,
            tenant: resolveRelationshipId(doc.tenant),
          },
          req,
          overrideAccess: false,
        } as any)

        return doc
      },
    ],
  },
}
