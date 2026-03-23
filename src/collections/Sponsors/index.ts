import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: {
    singular: '🥳 Sponsors',
    plural: '🥳 Sponsors',
  },
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'picture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'contactNumber',
      label: 'Contact Number',
      type: 'text',
      validate: (val: any) => {
        if (!val) return true
        // If it's not a string (null/undefined), let 'required: true' handle it
        if (typeof val !== 'string') return true
        const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/
        if (!bdPhoneRegex.test(val)) {
          return 'Please enter a valid Bangladesh contact number (e.g., 01712345678 or +8801712345678)'
        }
        return true
      },
      admin: {
        placeholder: '017XXXXXXXX',
      },
    },
    {
      name: 'amounts',
      type: 'array',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'description',
      type: 'text',
      required: true,
    },
  ],
}
