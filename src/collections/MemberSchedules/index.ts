import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const MemberSchedules: CollectionConfig = {
  slug: 'member-schedules',
  labels: {
    singular: '🦑 Member Schedule',
    plural: '🦑 Member Schedules',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
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
