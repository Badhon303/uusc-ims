import { isAdmin } from '@/utils/access/isAdmin'
import { sql } from 'drizzle-orm'
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
    components: {
      beforeList: ['@/components/CoachSalaryReports'],
    },
  },
  access: {
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
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
    beforeChange: [
      ({ data }) => {
        if (data.salaries && Array.isArray(data.salaries)) {
          data.totalPaid = data.salaries
            .filter((p: any) => p.status === 'paid')
            .reduce((sum: number, p: any) => sum + (Number(p.salary) || 0), 0)

          data.totalDue = data.salaries
            .filter((p: any) => p.status === 'unpaid')
            .reduce((sum: number, p: any) => sum + (Number(p.salary) || 0), 0)

          data.salaries.sort(
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
      path: '/expense-for-coach-salaries',
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
                COALESCE(SUM(CASE WHEN s.status = 'paid' THEN s.salary ELSE 0 END), 0) AS "coachPaidSalary",
                COUNT(s.id) AS "totalCoachSalaryCount",
                COALESCE(SUM(CASE WHEN s.status = 'unpaid' THEN s.salary ELSE 0 END), 0) AS "coachDueSalary"
              FROM coach_salaries_salaries s
              WHERE 1=1
              ${start && end ? sql`AND s.payment_month >= ${start} AND s.payment_month <= ${end}` : sql``}
            `)

          const data = result.rows?.[0] || {}
          return Response.json({
            coachPaidSalary: Number(data.coachPaidSalary || 0),
            totalCoachSalaryCount: Number(data.totalCoachSalaryCount || 0),
            coachDueSalary: Number(data.coachDueSalary || 0),
            filter: month && year ? { month, year } : 'all',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch coach salary stats' }, { status: 500 })
        }
      },
    },
  ],
}
