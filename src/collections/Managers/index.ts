import { isAdmin } from '@/utils/access/isAdmin'
import { sql } from 'drizzle-orm'
import type { CollectionConfig } from 'payload'

export const Managers: CollectionConfig = {
  slug: 'managers',
  labels: {
    singular: '🦒 Manager',
    plural: '🦒 Managers',
  },
  admin: {
    useAsTitle: 'user',
    group: '💼 Back Office',
    components: {
      beforeList: ['@/components/ManagerSalaryReports'],
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
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
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'joinDate',
          type: 'date',
          defaultValue: new Date().toISOString(),
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            {
              label: 'Active',
              value: 'active',
            },
            {
              label: 'Pending',
              value: 'pending',
            },
            {
              label: 'Inactive',
              value: 'inactive',
            },
          ],
          defaultValue: 'inactive',
          required: true,
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
      path: '/expense-for-manager-salaries',
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
                COALESCE(SUM(CASE WHEN s.status = 'paid' THEN s.salary ELSE 0 END), 0) AS "managerPaidSalary",
                COUNT(s.id) AS "totalManagerSalaryCount",
                COALESCE(SUM(CASE WHEN s.status = 'unpaid' THEN s.salary ELSE 0 END), 0) AS "managerDueSalary"
              FROM managers_salaries s  
              WHERE 1=1
              ${start && end ? sql`AND s.payment_month >= ${start} AND s.payment_month <= ${end}` : sql``}
            `)

          const data = result.rows?.[0] || {}
          return Response.json({
            managerPaidSalary: Number(data.managerPaidSalary || 0),
            totalManagerSalaryCount: Number(data.totalManagerSalaryCount || 0),
            managerDueSalary: Number(data.managerDueSalary || 0),
            filter: month && year ? { month, year } : 'all',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch manager salary stats' }, { status: 500 })
        }
      },
    },
  ],
}
