import type { CollectionConfig } from 'payload'
import { isSuperAdminUser } from '@/utils/access/currentUser'

export const SubscriptionEvents: CollectionConfig = {
  slug: 'subscription-events',
  labels: {
    singular: 'Subscription Event',
    plural: 'Subscription Events',
  },
  admin: {
    useAsTitle: 'eventType',
    group: 'Platform',
    defaultColumns: ['tenant', 'eventType', 'createdAt'],
  },
  access: {
    // Platform-internal subscription audit trail: super admins only.
    read: ({ req }) => isSuperAdminUser(req),
    create: ({ req }) => isSuperAdminUser(req),
    update: ({ req }) => isSuperAdminUser(req),
    delete: ({ req }) => isSuperAdminUser(req),
    admin: ({ req }) => isSuperAdminUser(req),
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants' as never,
      required: true,
      index: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        'trial_started',
        'trial_extended',
        'trial_converted',
        'plan_changed',
        'one_time_purchased',
        'setup_fee_charged',
        'invoice_generated',
        'payment_received',
        'payment_failed',
        'suspended',
        'reactivated',
        'cancelled',
      ],
    },
    {
      name: 'fromValue',
      type: 'json',
    },
    {
      name: 'toValue',
      type: 'json',
    },
    {
      name: 'triggeredBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
    },
    {
      name: 'note',
      type: 'textarea',
    },
  ],
  timestamps: true,
}
