import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const StudentAttendance: CollectionConfig = {
  slug: 'student-attendance',
  labels: {
    singular: '🪃 Student Attendance',
    plural: '🪃 Student Attendances',
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
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      unique: true,
      hasMany: false,
    },
    {
      name: 'attendances',
      type: 'array',
      validate: (val: any) => {
        if (!val || !Array.isArray(val)) return true

        const seen = new Set()
        for (const p of val) {
          if (!p.attendanceMonth) continue
          const date = new Date(p.attendanceMonth)
          // Key format: "2024-5" (Year-MonthIndex)
          const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`

          if (seen.has(key)) {
            return `Duplicate attendance detected for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
          }
          seen.add(key)
        }
        return true
      },
      fields: [
        {
          name: 'attendanceMonth',
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
          name: 'notes',
          type: 'textarea',
        },
        {
          name: 'absentDates',
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
          ],
        },
      ],
    },
  ],
}
