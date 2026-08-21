import type { GlobalConfig } from 'payload'
import { isSuperAdminUser } from '@/utils/access/currentUser'

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  label: 'Platform Settings',
  access: {
    read: ({ req }) => isSuperAdminUser(req),
    update: ({ req }) => isSuperAdminUser(req),
  },
  admin: {
    group: 'Platform',
  },
  fields: [
    {
      name: 'trialDurationDaysDefault',
      type: 'number',
      required: true,
      defaultValue: 14,
      min: 1,
    },
    {
      name: 'defaultPaidPlan',
      type: 'relationship',
      relationTo: 'subscription-plans' as never,
      required: false,
    },
    {
      name: 'readOnlyOnSuspended',
      type: 'checkbox',
      defaultValue: true,
      required: true,
    },
    {
      name: 'billingReminderDaysBefore',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 0,
    },
  ],
}
