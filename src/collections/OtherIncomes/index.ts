import { sql } from 'drizzle-orm'
import { CollectionConfig } from 'payload'

export const OtherIncomes: CollectionConfig = {
  slug: 'other-incomes',
  labels: {
    singular: '🥰 Other Income',
    plural: '🥰 Other Incomes',
  },
  admin: {
    useAsTitle: 'title',
    group: '💳 Payments & Packages',
    components: {
      beforeList: ['@/components/OtherIncomeReports'],
    },
  },
  access: {
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
  endpoints: [
    {
      path: '/income-from-others',
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
                  COALESCE(SUM(oi.amount), 0) as "totalOtherIncomeAmount",
                  COUNT(oi.id) as "totalOtherIncomeCount"

                FROM other_incomes oi

                WHERE 1=1
                ${start && end ? sql`AND oi.date >= ${start} AND oi.date <= ${end}` : sql``}
              `)

          const data = result.rows?.[0] || {}

          return Response.json({
            totalOtherIncomeAmount: Number(data.totalOtherIncomeAmount || 0),
            totalOtherIncomeCount: Number(data.totalOtherIncomeCount || 0),
            filter: month && year ? { month, year } : 'all',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch other income stats' }, { status: 500 })
        }
      },
    },
  ],
}
