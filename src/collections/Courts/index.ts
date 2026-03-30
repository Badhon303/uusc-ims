import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Courts: CollectionConfig = {
  slug: 'courts',
  labels: {
    singular: '🏸 Court',
    plural: '🏸 Courts',
  },
  admin: {
    useAsTitle: 'name',
    group: '⚙️ Settings',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'peakHourPrice',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'normalHourPrice',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
  ],
}
