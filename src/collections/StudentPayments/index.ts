import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'
import { getMemberPackage } from '../Members'

export const getStudentPackage = async (req: any) => {
  // ✅ If already fetched, reuse
  if (req.studentPackage) return req.studentPackage

  const result = await req.payload.find({
    collection: 'packages',
    where: {
      title: {
        equals: 'Academy Students',
      },
    },
    limit: 1,
  })

  req.studentPackage = result.docs?.[0] || null

  return req.studentPackage
}

export const StudentPayments: CollectionConfig = {
  slug: 'student-payments',
  labels: {
    singular: '🪅 Student Payment',
    plural: '🪅 Student Payments',
  },
  admin: {
    useAsTitle: 'student',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager') return true
      return {
        'user.id': { equals: user.id },
      }
    },
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
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
      name: 'registrationFee',
      type: 'number',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
      },
      defaultValue: async ({ req }) => {
        const pkg = await getStudentPackage(req)
        return pkg?.registrationFee || 0
      },
      required: true,
    },
    {
      name: 'payments',
      type: 'array',
      access: {
        update: ({ req }) => {
          return (
            req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'coach'
          )
        },
        create: ({ req }) => {
          return (
            req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'coach'
          )
        },
      },
      fields: [
        {
          name: 'paymentMonth',
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
          name: 'amount',
          type: 'number',
          required: true,
          admin: {
            readOnly: true,
          },
          defaultValue: async ({ req }) => {
            const pkg = await getMemberPackage(req)
            return pkg?.price || 0
          },
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
    beforeChange: [
      ({ data }) => {
        if (data.payments && Array.isArray(data.payments)) {
          data.totalPaid = data.payments
            .filter((p: any) => p.status === 'paid')
            .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

          data.totalDue = data.payments
            .filter((p: any) => p.status === 'unpaid')
            .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

          data.payments.sort(
            (a: any, b: any) =>
              new Date(b.paymentMonth).getTime() - new Date(a.paymentMonth).getTime(),
          )
        }
        return data
      },
    ],
  },
}
