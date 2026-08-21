import type { CollectionConfig } from 'payload'
import {
  addMonths,
  createSubscriptionEvent,
  resolveRelationshipId,
  sumLineItems,
} from '@/utils/subscriptions'
import { getCurrentUser, getTenantIdFromUser, isSuperAdminUser } from '@/utils/access/currentUser'

export const SubscriptionInvoices: CollectionConfig = {
  slug: 'subscription-invoices',
  labels: {
    singular: 'Subscription Invoice',
    plural: 'Subscription Invoices',
  },
  admin: {
    useAsTitle: 'gatewayTransactionId',
    group: 'Platform',
    defaultColumns: ['tenant', 'amount', 'status', 'dueAt', 'paidAt'],
  },
  access: {
    // Read-only visibility of their own billing history for tenant admins.
    read: ({ req }) => {
      if (isSuperAdminUser(req)) {
        return true
      }

      const tenantId = getCurrentUser(req)?.role === 'admin' ? getTenantIdFromUser(req) : null

      if (!tenantId) {
        return false
      }

      return {
        tenant: {
          equals: tenantId,
        },
      }
    },
    create: ({ req }) => isSuperAdminUser(req),
    update: ({ req }) => isSuperAdminUser(req),
    delete: ({ req }) => isSuperAdminUser(req),
    admin: ({ req }) => isSuperAdminUser(req) || getCurrentUser(req)?.role === 'admin',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'tenant',
          type: 'relationship',
          relationTo: 'tenants' as never,
          required: true,
          index: true,
        },
        {
          name: 'planSnapshot',
          type: 'group',
          fields: [
            {
              name: 'billingType',
              type: 'select',
              required: true,
              options: ['recurring', 'one-time'],
            },
            {
              name: 'monthlyPrice',
              type: 'number',
              min: 0,
            },
            {
              name: 'oneTimePrice',
              type: 'number',
              min: 0,
            },
            {
              name: 'currency',
              type: 'text',
              required: true,
            },
            {
              name: 'setupFee',
              type: 'number',
              min: 0,
            },
          ],
        },
      ],
    },
    {
      name: 'invoiceType',
      type: 'select',
      required: true,
      defaultValue: 'subscription',
      options: [
        {
          label: 'Subscription (recurring period)',
          value: 'subscription',
        },
        {
          label: 'One-time (lifetime purchase / setup fee)',
          value: 'one-time',
        },
      ],
      admin: {
        description:
          'One-time invoices have no billing period and activate the tenant permanently once paid.',
      },
    },
    {
      name: 'lineItems',
      type: 'array',
      labels: {
        singular: 'Line Item',
        plural: 'Line Items',
      },
      admin: {
        description: 'When present, the invoice amount is the sum of these lines.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
            },
            {
              name: 'kind',
              type: 'select',
              required: true,
              defaultValue: 'subscription',
              options: ['subscription', 'one-time', 'setup-fee'],
            },
            {
              name: 'amount',
              type: 'number',
              required: true,
              min: 0,
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'billingPeriodStart',
          type: 'date',
          admin: {
            condition: (data) => data?.invoiceType !== 'one-time',
          },
          validate: (value: unknown, { data }: any) =>
            data?.invoiceType === 'one-time' || value
              ? true
              : 'A billing period start is required for subscription invoices.',
        },
        {
          name: 'billingPeriodEnd',
          type: 'date',
          admin: {
            condition: (data) => data?.invoiceType !== 'one-time',
          },
          validate: (value: unknown, { data }: any) =>
            data?.invoiceType === 'one-time' || value
              ? true
              : 'A billing period end is required for subscription invoices.',
        },
        {
          name: 'dueAt',
          type: 'date',
          required: true,
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
          admin: {
            description: 'Recalculated from the line items when any are present.',
          },
        },
        {
          name: 'currency',
          type: 'text',
          required: true,
          defaultValue: 'BDT',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          options: ['draft', 'pending', 'paid', 'failed', 'void'],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'paymentMethod',
          type: 'select',
          required: false,
          options: ['bkash', 'nagad', 'sslcommerz', 'manual/bank-transfer'],
        },
        {
          name: 'gatewayTransactionId',
          type: 'text',
          unique: true,
        },
        {
          name: 'issuedAt',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'paidAt',
          type: 'date',
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          required: false,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (!data.createdBy && req.user) {
          data.createdBy = req.user.id
        }

        if (Array.isArray(data.lineItems) && data.lineItems.length) {
          data.amount = sumLineItems(data.lineItems)
        }

        if (data.invoiceType === 'one-time') {
          data.billingPeriodStart = null
          data.billingPeriodEnd = null
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        if (operation === 'create') {
          await createSubscriptionEvent({
            req,
            tenant: resolveRelationshipId(doc.tenant) || resolveRelationshipId(doc.id) || '',
            eventType: 'invoice_generated',
            toValue: {
              invoiceId: doc.id,
              amount: doc.amount,
              dueAt: doc.dueAt,
            },
            triggeredBy: resolveRelationshipId(doc.createdBy),
          })
        }

        if (previousDoc?.status !== 'paid' && doc.status === 'paid') {
          const tenantId = resolveRelationshipId(doc.tenant)

          if (tenantId) {
            const paidAt = doc.paidAt ? new Date(doc.paidAt) : new Date()
            const isOneTime = doc.invoiceType === 'one-time'
            const coversSetupFee = (doc.lineItems || []).some(
              (line: { kind?: string }) => line?.kind === 'setup-fee',
            )

            const tenantData: Record<string, unknown> = isOneTime
              ? {
                  // Lifetime purchase: nothing further to bill, so the tenant never expires
                  autoSuspendOnExpiry: false,
                  currentPeriodEnd: null,
                  currentPeriodStart: doc.paidAt || paidAt.toISOString(),
                  lifetimePurchasedAt: doc.paidAt || paidAt.toISOString(),
                  nextBillingDate: null,
                  subscriptionStatus: 'active',
                }
              : {
                  currentPeriodStart: doc.billingPeriodStart,
                  currentPeriodEnd: doc.billingPeriodEnd,
                  nextBillingDate: addMonths(new Date(doc.billingPeriodEnd), 1),
                  subscriptionStatus: 'active',
                }

            if (coversSetupFee) {
              tenantData.setupFeeChargedAt = doc.paidAt || paidAt.toISOString()
            }

            await req.payload.update({
              collection: 'tenants' as never,
              id: tenantId,
              data: tenantData,
              req,
              // System-driven billing transition (also reached from gateway webhooks)
              overrideAccess: true,
            } as any)

            await createSubscriptionEvent({
              req,
              tenant: tenantId,
              eventType: 'payment_received',
              fromValue: { invoiceStatus: previousDoc?.status },
              toValue: { invoiceStatus: doc.status, paidAt: doc.paidAt },
              triggeredBy: resolveRelationshipId(doc.createdBy),
            })

            if (isOneTime) {
              await createSubscriptionEvent({
                req,
                tenant: tenantId,
                eventType: 'one_time_purchased',
                toValue: {
                  invoiceId: doc.id,
                  amount: doc.amount,
                  lifetimePurchasedAt: tenantData.lifetimePurchasedAt,
                },
                triggeredBy: resolveRelationshipId(doc.createdBy),
              })
            }

            if (coversSetupFee) {
              await createSubscriptionEvent({
                req,
                tenant: tenantId,
                eventType: 'setup_fee_charged',
                toValue: {
                  invoiceId: doc.id,
                  setupFeeChargedAt: tenantData.setupFeeChargedAt,
                },
                triggeredBy: resolveRelationshipId(doc.createdBy),
              })
            }
          }
        }

        if (previousDoc?.status !== 'failed' && doc.status === 'failed') {
          const tenantId = resolveRelationshipId(doc.tenant)

          if (tenantId) {
            await req.payload.update({
              collection: 'tenants' as never,
              id: tenantId,
              data: {
                subscriptionStatus: 'past_due',
              },
              req,
              // System-driven billing transition (also reached from gateway webhooks)
              overrideAccess: true,
            } as any)

            await createSubscriptionEvent({
              req,
              tenant: tenantId,
              eventType: 'payment_failed',
              fromValue: { invoiceStatus: previousDoc?.status },
              toValue: { invoiceStatus: doc.status },
              triggeredBy: resolveRelationshipId(doc.createdBy),
            })
          }
        }

        return doc
      },
    ],
  },
  endpoints: [
    {
      path: '/webhooks/:provider',
      method: 'post',
      handler: async (req) => {
        if (!req.json) {
          return Response.json({ message: 'Unsupported request format' }, { status: 400 })
        }

        const body = await req.json()
        const { gatewayTransactionId, status, paidAt } = body ?? {}

        if (!gatewayTransactionId || !status) {
          return Response.json(
            { message: 'Missing gatewayTransactionId or status' },
            { status: 400 },
          )
        }

        const invoices = await req.payload.find({
          collection: 'subscription-invoices' as never,
          where: {
            gatewayTransactionId: {
              equals: gatewayTransactionId,
            },
          },
          limit: 1,
          depth: 0,
        } as any)

        const invoice = invoices.docs?.[0] as any

        if (!invoice) {
          return Response.json({ message: 'Invoice not found' }, { status: 404 })
        }

        if (invoice.status === 'paid' && status === 'paid') {
          return Response.json({ message: 'Already processed' }, { status: 200 })
        }

        const updated = (await req.payload.update({
          collection: 'subscription-invoices' as never,
          id: invoice.id,
          data: {
            status,
            paidAt: status === 'paid' ? paidAt || new Date() : null,
          },
          overrideAccess: true,
        } as any)) as any

        return Response.json({ id: updated.id, status: updated.status }, { status: 200 })
      },
    },
  ],
}
