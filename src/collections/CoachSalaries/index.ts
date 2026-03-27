import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const CoachSalaries: CollectionConfig = {
  slug: 'coach-salaries',
  labels: {
    singular: '💰 Coach Salary',
    plural: '💰 Coach Salaries',
  },
  admin: {
    useAsTitle: 'coach',
    group: '💼 Back Office',
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
      type: 'row',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      fields: [
        {
          name: 'coach',
          type: 'relationship',
          relationTo: 'coaches',
          required: true,
          unique: true,
          hasMany: false,
        },
        {
          name: 'totalDue',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'totalPaid',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'salaries',
      type: 'array',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      fields: [
        {
          name: 'paymentMonth',
          type: 'date',
          admin: {
            date: {
              displayFormat: 'MMMM yyyy',
            },
          },
          defaultValue: () => new Date(),
        },
        {
          name: 'salary',
          type: 'number',
          required: true,
          defaultValue: 0,
        },
        {
          name: 'paymentMethod',
          type: 'select',
          required: true,
          options: [
            { label: 'Cash', value: 'cash' },
            { label: 'Mobile Banking', value: 'mobile-banking' },
            { label: 'Card', value: 'card' },
          ],
          defaultValue: 'cash',
        },
        {
          name: 'transactionRef',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          options: [
            { label: 'Paid', value: 'paid' },
            { label: 'Unpaid', value: 'unpaid' },
          ],
          defaultValue: 'unpaid',
        },
      ],
    },
  ],
  hooks: {
    beforeRead: [
      async ({ doc, req }) => {
        if (doc?.coach) {
          // If already populated (depth >= 1), use it directly — no extra query
          if (typeof doc.coach === 'object') {
            doc.coachName = doc.coach.coachName ?? null
          } else {
            // Fallback for depth: 0 — manually fetch
            try {
              const coachDoc = await req.payload.findByID({
                collection: 'coaches',
                id: doc.coach,
                depth: 0,
              })
              doc.coachName = coachDoc?.coachName ?? null
            } catch {
              doc.coachName = null
            }
          }
        }
        return doc
      },
    ],
  },
}
