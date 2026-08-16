import { sql } from 'drizzle-orm'
import { CollectionConfig } from 'payload'
import { resolveReportTenantScope } from '@/utils/access/tenantReport'

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
    read: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
  },
  fields: [
    {
      type: 'row',
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
      ],
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
        // 1. Access Control
        if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
          return Response.json({ error: 'forbidden' }, { status: 403 })
        }
        try {
          const { month, year } = req.query

          let start: Date | null = null
          let end: Date | null = null

          if (month && year) {
            start = new Date(Number(year), Number(month) - 1, 1)
            end = new Date(Number(year), Number(month), 0, 23, 59, 59)
          }

          const { tenantId, isSuperAdmin } = resolveReportTenantScope(req)

          if (!isSuperAdmin && !tenantId) {
            return Response.json({ error: 'forbidden' }, { status: 403 })
          }

          const result = await req.payload.db.drizzle.execute(sql`
                SELECT
                  COALESCE(SUM(oi.amount), 0) as "totalOtherIncomeAmount",
                  COUNT(oi.id) as "totalOtherIncomeCount"

                FROM other_incomes oi

                WHERE 1=1
                ${tenantId ? sql`AND oi.tenant_id = ${tenantId}` : sql``}
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
    {
      path: '/overall-income-stats',
      method: 'get',
      handler: async (req: any) => {
        // 1. Access Control
        if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
          return Response.json({ error: 'forbidden' }, { status: 403 })
        }
        try {
          const { month, year } = req.query
          let start: Date | null = null
          let end: Date | null = null

          if (month && year) {
            start = new Date(Number(year), Number(month) - 1, 1)
            end = new Date(Number(year), Number(month), 0, 23, 59, 59)
          }

          const { tenantId, isSuperAdmin } = resolveReportTenantScope(req)

          if (!isSuperAdmin && !tenantId) {
            return Response.json({ error: 'forbidden' }, { status: 403 })
          }

          // Strict allowlist of column names that may be interpolated into raw
          // SQL. Any caller passing a value outside this set throws instead of
          // silently injecting it.
          const ALLOWED_DATE_COLUMNS = new Set(['cbb.booking_date', 'sa.date', 'date'])
          const dateFilter = (col: string) => {
            if (!ALLOWED_DATE_COLUMNS.has(col)) {
              throw new Error(`Disallowed date column in report filter: ${col}`)
            }
            return start
              ? sql`AND ${sql.raw(col)} >= ${start} AND ${sql.raw(col)} <= ${end}`
              : sql``
          }

          // 1. Fetch all data in parallel for better performance
          const [members, students, bookings, sponsors, others] = await Promise.all([
            // Members Query
            req.payload.db.drizzle.execute(sql`
          SELECT 
            (SELECT COALESCE(SUM(registration_fee), 0) FROM member_payments WHERE 1=1 ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``} ${start ? sql`AND registration_date >= ${start} AND registration_date <= ${end}` : sql``}) as reg,
            COALESCE(SUM(CASE WHEN mpp.status = 'paid' AND ${start ? sql`mpp.payment_month >= ${start} AND mpp.payment_month <= ${end}` : sql`TRUE`} THEN mpp.amount ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN mpp.status = 'unpaid' AND ${start ? sql`mpp.payment_month >= ${start} AND mpp.payment_month <= ${end}` : sql`TRUE`} THEN mpp.amount ELSE 0 END), 0) as due
          FROM member_payments_payments mpp
          INNER JOIN member_payments mp ON mp.id = mpp._parent_id
          WHERE 1=1 ${tenantId ? sql`AND mp.tenant_id = ${tenantId}` : sql``}`),

            // Students Query
            req.payload.db.drizzle.execute(sql`
          SELECT 
            (SELECT COALESCE(SUM(registration_fee), 0) FROM student_payments WHERE 1=1 ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``} ${start ? sql`AND registration_date >= ${start} AND registration_date <= ${end}` : sql``}) as reg,
            COALESCE(SUM(CASE WHEN spp.status = 'paid' AND ${start ? sql`spp.payment_month >= ${start} AND spp.payment_month <= ${end}` : sql`TRUE`} THEN spp.amount ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN spp.status = 'unpaid' AND ${start ? sql`spp.payment_month >= ${start} AND spp.payment_month <= ${end}` : sql`TRUE`} THEN spp.amount ELSE 0 END), 0) as due
          FROM student_payments_payments spp
          INNER JOIN student_payments sp ON sp.id = spp._parent_id
          WHERE 1=1 ${tenantId ? sql`AND sp.tenant_id = ${tenantId}` : sql``}`),

            // Bookings Query
            req.payload.db.drizzle.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN bp.payment_status = 'paid' THEN bp.total_amount ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN bp.payment_status = 'unpaid' THEN bp.total_amount ELSE 0 END), 0) as due
          FROM booking_payments bp
          INNER JOIN court_bookings_bookings cbb ON cbb._parent_id = bp.booking_id
          WHERE 1=1 ${tenantId ? sql`AND bp.tenant_id = ${tenantId}` : sql``} ${dateFilter('cbb.booking_date')}`),

            // Sponsors Query
            req.payload.db.drizzle.execute(sql`
          SELECT COALESCE(SUM(sa.amount), 0) as paid
          FROM sponsors_amounts sa
          INNER JOIN sponsors s ON s.id = sa._parent_id
          WHERE 1=1 ${tenantId ? sql`AND s.tenant_id = ${tenantId}` : sql``} ${dateFilter('sa.date')}`),

            // Others Query
            req.payload.db.drizzle.execute(sql`
          SELECT COALESCE(SUM(amount), 0) as paid FROM other_incomes WHERE 1=1 ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``} ${dateFilter('date')}`),
          ])

          // 2. Parse Results
          const mData = members.rows[0]
          const sData = students.rows[0]
          const bData = bookings.rows[0]
          const spData = sponsors.rows[0]
          const oData = others.rows[0]

          const totals = {
            memberRegistrationIncome: Number(mData.reg),
            memberSubscriptionIncome: Number(mData.paid),
            memberIncome: Number(mData.reg) + Number(mData.paid),
            memberDue: Number(mData.due),
            studentRegistrationIncome: Number(sData.reg),
            studentSubscriptionIncome: Number(sData.paid),
            studentIncome: Number(sData.reg) + Number(sData.paid),
            studentDue: Number(sData.due),
            bookingIncome: Number(bData.paid),
            bookingDue: Number(bData.due),
            sponsorIncome: Number(spData.paid),
            otherIncome: Number(oData.paid),
          }

          const grandTotalIncome =
            totals.memberIncome +
            totals.studentIncome +
            totals.bookingIncome +
            totals.sponsorIncome +
            totals.otherIncome
          const grandTotalDue = totals.memberDue + totals.studentDue + totals.bookingDue

          return Response.json({
            summary: {
              grandTotalIncome,
              grandTotalDue,
              collectionRate:
                grandTotalIncome > 0
                  ? (grandTotalIncome / (grandTotalIncome + grandTotalDue)) * 100
                  : 0,
            },
            breakdown: totals,
            filter: month && year ? { month, year } : 'all-time',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  ],
}
