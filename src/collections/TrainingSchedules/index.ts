import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const TrainingSchedules: CollectionConfig = {
  slug: 'training-schedules',
  labels: {
    singular: '🐉 Training Schedule',
    plural: '🐉 Training Schedules',
  },
  admin: {
    useAsTitle: 'trainingGroup',
    group: '📅 Schedule',
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
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'trainingGroup',
      type: 'relationship',
      relationTo: 'training-groups',
      required: true,
    },
    {
      name: 'coach',
      type: 'relationship',
      relationTo: 'coaches',
      required: true,
    },
    {
      name: 'courts',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
      hasMany: true,
    },
    {
      name: 'daysOfWeek',
      type: 'select',
      required: true,
      hasMany: true,
      options: [
        { label: 'Saturday', value: 'saturday' },
        { label: 'Sunday', value: 'sunday' },
        { label: 'Monday', value: 'monday' },
        { label: 'Tuesday', value: 'tuesday' },
        { label: 'Wednesday', value: 'wednesday' },
        { label: 'Thursday', value: 'thursday' },
        { label: 'Friday', value: 'friday' },
      ],
    },
    {
      name: 'startTime',
      type: 'date',
      required: true,
    },
    {
      name: 'endTime',
      type: 'date',
      required: true,
    },
    {
      name: 'offDays',
      type: 'array',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Single Day', value: 'single' },
            { label: 'Range', value: 'range' },
          ],
          defaultValue: 'single',
        },
        {
          name: 'date',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'single',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'from',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'range',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'to',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'range',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'reason',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ],
}
