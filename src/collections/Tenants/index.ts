import type { CollectionConfig } from 'payload'
import {
  addMonths,
  buildPlanLineItems,
  createSubscriptionEvent,
  getPlatformSettings,
  getSubscriptionPlan,
  resolveRelationshipId,
  sumLineItems,
  syncTenantUsersSubscriptionStatus,
  addDays,
} from '@/utils/subscriptions'
import { getCurrentUser, getTenantIdFromUser, isSuperAdminUser } from '@/utils/access/currentUser'

const tenantStatuses = ['trialing', 'active', 'past_due', 'suspended', 'cancelled']

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: {
    singular: 'Tenant',
    plural: 'Tenants',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Platform',
    defaultColumns: ['name', 'slug', 'subscriptionStatus', 'trialEndsAt', 'nextBillingDate'],
    // hidden if not super admin
    hidden: ({ user }) =>
      !((user as { isSuperAdmin?: boolean } | null | undefined)?.isSuperAdmin === true),
  },
  access: {
    // Managing tenants is super admin only. Tenant users can only ever read their
    // own tenant document, which the multi-tenant plugin needs for scoping.
    read: ({ req }) => {
      if (isSuperAdminUser(req)) {
        return true
      }

      const tenantId = getTenantIdFromUser(req)

      if (!tenantId) {
        return false
      }

      return {
        id: {
          equals: tenantId,
        },
      }
    },
    create: ({ req }) => isSuperAdminUser(req),
    update: ({ req }) => isSuperAdminUser(req),
    delete: ({ req }) => isSuperAdminUser(req),
    admin: ({ req }) => isSuperAdminUser(req),
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'logoId',
          type: 'upload',
          relationTo: 'media',
          required: false,
        },
        {
          name: 'contactNumber',
          type: 'text',
        },
        {
          name: 'address',
          type: 'text',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'timezone',
          type: 'text',
          required: true,
          defaultValue: 'Asia/Dhaka',
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
      name: 'settings',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'latePaymentGraceDays',
              type: 'number',
              defaultValue: 3,
              min: 0,
            },
          ],
        },
        {
          name: 'cancellationPolicy',
          type: 'textarea',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'subscriptionPlan',
          type: 'relationship',
          relationTo: 'subscription-plans' as never,
          required: false,
        },
        {
          name: 'subscriptionStatus',
          type: 'select',
          required: true,
          defaultValue: 'trialing',
          options: tenantStatuses,
        },
        {
          name: 'billingCycle',
          type: 'select',
          required: true,
          defaultValue: 'monthly',
          options: [
            {
              label: 'Monthly',
              value: 'monthly',
            },
            {
              label: 'One-time (lifetime)',
              value: 'one-time',
            },
          ],
          admin: {
            description: 'Kept in sync with the billing type of the selected plan.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'trialStartedAt',
          type: 'date',
        },
        {
          name: 'trialEndsAt',
          type: 'date',
        },
        {
          name: 'currentPeriodStart',
          type: 'date',
        },
        {
          name: 'currentPeriodEnd',
          type: 'date',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'nextBillingDate',
          type: 'date',
        },
        {
          name: 'gracePeriodDays',
          type: 'number',
          defaultValue: 3,
          min: 0,
        },
        {
          name: 'autoSuspendOnExpiry',
          type: 'checkbox',
          defaultValue: true,
          required: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lifetimePurchasedAt',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Stamped when a one-time (lifetime) invoice is paid.',
          },
        },
        {
          name: 'setupFeeChargedAt',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Stamped once the plan’s setup fee has been invoiced and paid.',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'suspendedAt',
          type: 'date',
        },
        {
          name: 'suspendedReason',
          type: 'textarea',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'cancelledAt',
          type: 'date',
        },
        {
          name: 'cancelledReason',
          type: 'textarea',
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        const nextData = (data ?? {}) as any

        if (operation !== 'create' && operation !== 'update') {
          return nextData
        }

        const settings = await getPlatformSettings(req)
        const now = new Date()

        // The billing cycle always follows the plan's billing type so the two can't drift
        const planId = resolveRelationshipId(
          nextData.subscriptionPlan ?? (originalDoc as any)?.subscriptionPlan,
        )

        if (planId) {
          const plan = await getSubscriptionPlan(req, planId)

          if (plan) {
            nextData.billingCycle = plan.billingType === 'one-time' ? 'one-time' : 'monthly'
          }
        }

        // A paid lifetime tenant has nothing left to bill, so it must never expire
        const normalizeLifetime = (data: any) => {
          if (data.billingCycle === 'one-time' && data.subscriptionStatus === 'active') {
            data.nextBillingDate = null
            data.currentPeriodEnd = null
            data.autoSuspendOnExpiry = false
          }

          return data
        }

        if (operation === 'create') {
          nextData.trialStartedAt = nextData.trialStartedAt || now
          nextData.trialEndsAt =
            nextData.trialEndsAt || addDays(now, Number(settings.trialDurationDaysDefault || 14))
          nextData.gracePeriodDays =
            nextData.gracePeriodDays ?? settings.defaultGracePeriodDays ?? 3
          nextData.subscriptionStatus = nextData.subscriptionStatus || 'trialing'
          nextData.nextBillingDate = nextData.nextBillingDate || nextData.trialEndsAt
          return normalizeLifetime(nextData)
        }

        if (nextData.subscriptionStatus === 'suspended' && !nextData.suspendedAt) {
          nextData.suspendedAt = now
        }

        if (nextData.subscriptionStatus === 'cancelled' && !nextData.cancelledAt) {
          nextData.cancelledAt = now
        }

        if (
          originalDoc?.subscriptionStatus === 'suspended' &&
          nextData.subscriptionStatus === 'active'
        ) {
          nextData.suspendedAt = null
          nextData.suspendedReason = null
        }

        return normalizeLifetime(nextData)
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        const tenantId = resolveRelationshipId(doc.id)

        if (!tenantId) {
          return doc
        }

        await syncTenantUsersSubscriptionStatus({
          req,
          tenantId,
          status: doc.subscriptionStatus || 'active',
        })

        if (operation === 'create') {
          await createSubscriptionEvent({
            req,
            tenant: tenantId,
            eventType: 'trial_started',
            toValue: {
              subscriptionStatus: doc.subscriptionStatus,
              trialEndsAt: doc.trialEndsAt,
            },
            triggeredBy: resolveRelationshipId(getCurrentUser(req)?.id),
          })

          return doc
        }

        if (previousDoc?.trialEndsAt !== doc.trialEndsAt) {
          await createSubscriptionEvent({
            req,
            tenant: tenantId,
            eventType: 'trial_extended',
            fromValue: { trialEndsAt: previousDoc?.trialEndsAt },
            toValue: { trialEndsAt: doc.trialEndsAt },
            triggeredBy: resolveRelationshipId(getCurrentUser(req)?.id),
          })
        }

        if (previousDoc?.subscriptionPlan !== doc.subscriptionPlan) {
          await createSubscriptionEvent({
            req,
            tenant: tenantId,
            eventType: 'plan_changed',
            fromValue: { subscriptionPlan: previousDoc?.subscriptionPlan },
            toValue: { subscriptionPlan: doc.subscriptionPlan },
            triggeredBy: resolveRelationshipId(getCurrentUser(req)?.id),
          })
        }

        if (previousDoc?.subscriptionStatus !== doc.subscriptionStatus) {
          const eventType =
            doc.subscriptionStatus === 'active'
              ? previousDoc?.subscriptionStatus === 'trialing'
                ? 'trial_converted'
                : 'reactivated'
              : doc.subscriptionStatus === 'suspended'
                ? 'suspended'
                : doc.subscriptionStatus === 'cancelled'
                  ? 'cancelled'
                  : 'payment_failed'

          await createSubscriptionEvent({
            req,
            tenant: tenantId,
            eventType,
            fromValue: { subscriptionStatus: previousDoc?.subscriptionStatus },
            toValue: { subscriptionStatus: doc.subscriptionStatus },
            triggeredBy: resolveRelationshipId(getCurrentUser(req)?.id),
          })
        }

        return doc
      },
    ],
  },
  endpoints: [
    /**
     * Issues the invoice a tenant owes for its current plan and lets the existing
     * invoice hooks do the rest: paying it activates the tenant (permanently for a
     * one-time plan) and stamps the setup fee as charged.
     */
    {
      path: '/:id/issue-invoice',
      method: 'post',
      handler: async (req) => {
        if (!isSuperAdminUser(req)) {
          return Response.json({ message: 'Forbidden' }, { status: 403 })
        }

        const tenantId = req.routeParams?.id as number | string | undefined

        if (!tenantId) {
          return Response.json({ message: 'Missing tenant id' }, { status: 400 })
        }

        const tenant = (await req.payload.findByID({
          collection: 'tenants' as never,
          id: tenantId as never,
          depth: 0,
          req,
          overrideAccess: true,
        })) as any

        const planId = resolveRelationshipId(tenant?.subscriptionPlan)

        if (!planId) {
          return Response.json(
            { message: 'This tenant has no subscription plan assigned.' },
            { status: 400 },
          )
        }

        const plan = await getSubscriptionPlan(req, planId)

        if (!plan) {
          return Response.json({ message: 'Subscription plan not found.' }, { status: 400 })
        }

        const lineItems = buildPlanLineItems({
          plan,
          includeSetupFee: !tenant?.setupFeeChargedAt,
        })

        if (!lineItems.length) {
          return Response.json({ message: 'This plan has nothing to charge.' }, { status: 400 })
        }

        const isOneTime = plan.billingType === 'one-time'
        const now = new Date()
        const periodStart = tenant?.currentPeriodEnd
          ? new Date(tenant.currentPeriodEnd)
          : new Date(now)

        const invoice = (await req.payload.create({
          collection: 'subscription-invoices' as never,
          data: {
            tenant: tenantId,
            plan: planId,
            invoiceType: isOneTime ? 'one-time' : 'subscription',
            lineItems,
            amount: sumLineItems(lineItems),
            currency: plan.currency || tenant?.currency || 'BDT',
            status: 'pending',
            issuedAt: now,
            dueAt: tenant?.nextBillingDate || now,
            ...(isOneTime
              ? {}
              : {
                  billingPeriodStart: periodStart,
                  billingPeriodEnd: addMonths(periodStart, 1),
                }),
          },
          req,
          overrideAccess: false,
        } as any)) as any

        return Response.json(
          { id: invoice.id, amount: invoice.amount, invoiceType: invoice.invoiceType },
          { status: 201 },
        )
      },
    },
    {
      path: '/onboard',
      method: 'post',
      handler: async (req) => {
        if (!isSuperAdminUser(req)) {
          return Response.json({ message: 'Forbidden' }, { status: 403 })
        }

        if (!req.json) {
          return Response.json({ message: 'Unsupported request format' }, { status: 400 })
        }

        const body = await req.json()
        const { name, slug, adminName, adminEmail, adminPassword, contactNumber } = body ?? {}

        if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
          return Response.json({ message: 'Missing required onboarding fields' }, { status: 400 })
        }

        const settings = await getPlatformSettings(req)
        const now = new Date()
        const trialEndsAt = addDays(now, Number(settings.trialDurationDaysDefault || 14))

        const tenant = await req.payload.create({
          collection: 'tenants' as never,
          data: {
            name,
            slug,
            contactNumber,
            subscriptionStatus: 'trialing',
            trialStartedAt: now,
            trialEndsAt,
            gracePeriodDays: settings.defaultGracePeriodDays || 3,
            nextBillingDate: trialEndsAt,
            autoSuspendOnExpiry: true,
          },
          req,
          overrideAccess: false,
        } as any)

        const tenantId = resolveRelationshipId(tenant.id)

        await req.payload.create({
          collection: 'users',
          data: {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            tenants: [{ tenant: tenantId }],
            tenantSubscriptionStatus: 'trialing',
          },
          req,
          overrideAccess: false,
        } as any)

        await req.payload.create({
          collection: 'packages',
          data: {
            title: 'Club Members',
            price: 0,
            registrationFee: 0,
            features: [],
            tenant: tenantId,
          },
          req,
          overrideAccess: false,
        } as any)

        await req.payload.create({
          collection: 'packages',
          data: {
            title: 'Academy Students',
            price: 0,
            registrationFee: 0,
            features: [],
            tenant: tenantId,
          },
          req,
          overrideAccess: false,
        } as any)

        await req.payload.create({
          collection: 'courts',
          data: {
            name: 'Court 1',
            peakHourPrice: 0,
            normalHourPrice: 0,
            tenant: tenantId,
          },
          req,
          overrideAccess: false,
        } as any)

        return Response.json({ tenantId, trialEndsAt }, { status: 201 })
      },
    },
  ],
}
