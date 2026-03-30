import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const TrainingGroups: CollectionConfig = {
  slug: 'training-groups',
  labels: {
    singular: '👯‍♂️ Training Group',
    plural: '👯‍♂️ Training Groups',
  },
  admin: {
    useAsTitle: 'name',
    group: '⛹️ Training',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'coach',
      type: 'relationship',
      relationTo: 'coaches',
      required: true,
    },
    {
      name: 'students',
      type: 'relationship',
      relationTo: 'students',
      hasMany: true,
    },
    {
      name: 'skillLevel',
      type: 'select',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
      ],
      required: true,
    },
  ],
}
