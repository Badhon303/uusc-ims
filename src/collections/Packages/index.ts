import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Packages: CollectionConfig = {
  slug: 'packages',
  labels: {
    singular: '💸 Package',
    plural: '💸 Packages',
  },
  admin: {
    useAsTitle: 'title',
    group: '⚙️ Settings',
  },
  access: {
    read: () => true,
    create: () => false,
    update: isAdmin,
    delete: () => false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'price',
      label: 'Price Per Month (BDT)',
      type: 'number',
      required: true,
    },
    {
      name: 'registrationFee',
      label: 'Registration Fee (BDT)',
      type: 'number',
      required: true,
    },
    {
      name: 'features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
