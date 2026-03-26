import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const StudentProgress: CollectionConfig = {
  slug: 'student-progress',
  labels: {
    singular: '💪 Student Progress',
    plural: '💪 Student Progresses',
  },
  admin: {
    useAsTitle: 'student',
    group: '⛹️ Training',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'student',
          type: 'relationship',
          relationTo: 'students',
          required: true,
          unique: true,
          hasMany: false,
        },
        {
          name: 'coach',
          type: 'relationship',
          relationTo: 'coaches',
          required: true,
          unique: true,
          hasMany: false,
        },
      ],
    },
    {
      name: 'evaluations',
      type: 'array',
      fields: [
        {
          name: 'evaluationMonth',
          type: 'date',
          admin: {
            date: {
              displayFormat: 'MMMM yyyy',
              pickerAppearance: 'monthOnly',
            },
          },
          defaultValue: () => new Date(),
        },
        {
          name: 'remarks',
          type: 'textarea',
        },
        {
          name: 'evaluation',
          type: 'array',
          minRows: 1,
          fields: [
            {
              name: 'skillCategory',
              type: 'select',
              options: [
                { label: 'Forehand', value: 'forehand' },
                { label: 'Backhand', value: 'backhand' },
                { label: 'Serve', value: 'serve' },
                { label: 'Smash', value: 'smash' },
                { label: 'Drop Shot', value: 'dropShot' },
                { label: 'Net Play', value: 'netPlay' },
                { label: 'Footwork', value: 'footwork' },
                { label: 'Stamina', value: 'stamina' },
                { label: 'Technique', value: 'technique' },
                { label: 'Strategy', value: 'strategy' },
              ],
            },
            {
              name: 'score',
              type: 'number',
            },
          ],
        },
      ],
    },
  ],
}
