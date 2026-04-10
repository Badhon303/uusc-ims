import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const MemberSchedules: CollectionConfig = {
  slug: 'member-schedules',
  labels: {
    singular: '🦑 Member Schedule',
    plural: '🦑 Member Schedules',
  },
  admin: {
    useAsTitle: 'shiftName',
    group: '📅 Schedule',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'shiftName',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      type: 'row',
      fields: [
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
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startTime',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'timeOnly',
            },
          },
        },
        {
          name: 'endTime',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'timeOnly',
            },
          },
        },
      ],
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
  ],
}
