import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const TrainingSchedules: CollectionConfig = {
  slug: 'training-schedules',
  labels: {
    singular: '🐉 Training Schedule',
    plural: '🐉 Training Schedules',
  },
  admin: {
    useAsTitle: 'trainingGroupId',
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
      name: 'trainingGroupId',
      type: 'relationship',
      relationTo: 'training-groups',
      required: true,
    },
    {
      name: 'coachId',
      type: 'relationship',
      relationTo: 'coaches',
      required: true,
    },
    {
      name: 'courtId',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
    },
    {
      name: 'dayOfWeek',
      type: 'select',
      required: true,
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
  ],
}
