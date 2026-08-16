import type { CollectionConfig } from 'payload'
import { getTenantIdFromUser, isSuperAdminUser } from '@/utils/access/currentUser'
import { resolveRelationshipId } from '@/utils/subscriptions'

export const SubscriptionPlans: CollectionConfig = {
  slug: 'subscription-plans',
  labels: {
    singular: 'Subscription Plan',
    plural: 'Subscription Plans',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Platform',
    hidden: ({ user }) =>
      !((user as { isSuperAdmin?: boolean } | null | undefined)?.isSuperAdmin === true),
  },
  access: {
    // Tenant users may only see the plan their own tenant is subscribed to.
    read: async ({ req }) => {
      if (!req.user) {
        return false
      }

      if (isSuperAdminUser(req)) {
        return true
      }

      const tenantId = getTenantIdFromUser(req)

      if (!tenantId) {
        return false
      }

      try {
        const tenant = (await req.payload.findByID({
          collection: 'tenants' as never,
          id: tenantId,
          depth: 0,
          req,
        } as any)) as any

        const planId = resolveRelationshipId(tenant?.subscriptionPlan)

        return planId ? { id: { equals: planId } } : false
      } catch {
        return false
      }
    },
    create: ({ req }) => isSuperAdminUser(req),
    update: ({ req }) => isSuperAdminUser(req),
    delete: ({ req }) => isSuperAdminUser(req),
    admin: ({ req }) => isSuperAdminUser(req),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'billingType',
      type: 'select',
      required: true,
      defaultValue: 'recurring',
      options: [
        {
          label: 'Recurring (monthly subscription)',
          value: 'recurring',
        },
        {
          label: 'One-time (lifetime purchase)',
          value: 'one-time',
        },
      ],
      admin: {
        description:
          'Recurring plans are invoiced every billing cycle. One-time plans are paid once and never expire.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'monthlyPrice',
          type: 'number',
          min: 0,
          admin: {
            condition: (_data, siblingData) => siblingData?.billingType !== 'one-time',
          },
          validate: (value: number | null | undefined, { siblingData }: any) => {
            if (siblingData?.billingType === 'one-time') {
              return true
            }

            return typeof value === 'number'
              ? true
              : 'A monthly price is required for recurring plans.'
          },
        },
        {
          name: 'oneTimePrice',
          type: 'number',
          min: 0,
          admin: {
            condition: (_data, siblingData) => siblingData?.billingType === 'one-time',
          },
          validate: (value: number | null | undefined, { siblingData }: any) => {
            if (siblingData?.billingType !== 'one-time') {
              return true
            }

            return typeof value === 'number'
              ? true
              : 'A one-time price is required for one-time plans.'
          },
        },
        {
          name: 'currency',
          type: 'text',
          required: true,
          defaultValue: 'BDT',
        },
        {
          name: 'isActive',
          type: 'checkbox',
          required: true,
          defaultValue: true,
        },
      ],
    },
    {
      name: 'setupFee',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        description:
          'Charged once, on the tenant’s first invoice. Applies to both recurring and one-time plans.',
      },
    },
    {
      name: 'features',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'maxCourts',
              type: 'number',
              defaultValue: 2,
              min: 0,
            },
            {
              name: 'maxUsers',
              type: 'number',
              defaultValue: 10,
              min: 0,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'tournamentsEnabled',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'whatsappNotificationsEnabled',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'reportsEnabled',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
  ],
}
