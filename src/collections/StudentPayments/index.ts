import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'
import { getMemberPackage } from '../Members'
import { sql } from 'drizzle-orm'

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
    group: '💳 Payments & Packages',
    components: {
      beforeList: ['@/components/StudentReports'], // This places the cards above the list
    },
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
          name: 'registrationFee',
          type: 'number',
          defaultValue: async ({ req }) => {
            const pkg = await getMemberPackage(req)
            return pkg?.registrationFee || 0
          },
          required: true,
        },
        {
          name: 'registrationDate',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
        },
      ],
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
  endpoints: [
    {
      path: '/income-from-students',
      method: 'get',
      handler: async (req: any) => {
        try {
          const { month, year } = req.query
          let start: Date | null = null
          let end: Date | null = null

          if (month && year) {
            start = new Date(Number(year), Number(month) - 1, 1)
            end = new Date(Number(year), Number(month), 0, 23, 59, 59)
          }

          const result = await req.payload.db.drizzle.execute(sql`
              SELECT 
                -- 1. Sum Registration Fees (Using a subquery to avoid duplicates from joins)
                (
                  SELECT COALESCE(SUM(registration_fee), 0)
                  FROM student_payments
                  WHERE ${start ? sql`registration_date >= ${start} AND registration_date <= ${end}` : sql`TRUE`}
               ) as "studentRegistrationFee",
 
               -- 2. Sum Subscription Fees (Paid)
               COALESCE(SUM(
                 CASE 
                   WHEN p.status = 'paid' 
                   AND ${start ? sql`p.payment_month >= ${start} AND p.payment_month <= ${end}` : sql`TRUE`}
                   THEN p.amount ELSE 0 
                 END
               ), 0) as "studentFee",
 
               -- 3. Sum Total Due (Unpaid Subscriptions)
               COALESCE(SUM(
                 CASE 
                   WHEN p.status = 'unpaid' 
                   AND ${start ? sql`p.payment_month >= ${start} AND p.payment_month <= ${end}` : sql`TRUE`}
                   THEN p.amount ELSE 0 
                 END
               ), 0) as "totalSubscriptionDue"
 
             FROM student_payments_payments p
           `)

          const data = result.rows?.[0] || {}

          const studentRegistrationFee = Number(data.studentRegistrationFee || 0)
          const studentFee = Number(data.studentFee || 0)
          const totalSubscriptionDue = Number(data.totalSubscriptionDue || 0)

          return Response.json({
            studentRegistrationFee,
            studentFee,
            totalIncome: studentRegistrationFee + studentFee,
            totalSubscriptionDue, // Added this field
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch income stats' }, { status: 500 })
        }
      },
    },
  ],
}
