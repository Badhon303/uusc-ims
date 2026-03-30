import { sql } from 'drizzle-orm'
import type { CollectionConfig } from 'payload'

export const Expenditures: CollectionConfig = {
  slug: 'expenditures',
  labels: {
    singular: '🐒 Expenditure',
    plural: '🐒 Expenditures',
  },
  admin: {
    useAsTitle: 'title',
    group: '💼 Back Office',
    components: {
      beforeList: ['@/components/ExpenditureReports'],
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
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'UtilityBill', value: 'utility-bill' },
        { label: 'EquipmentPurchase', value: 'equipment-purchase' },
        { label: 'TournamentExpenses', value: 'tournament-expenses' },
        { label: 'IndoorFacility', value: 'indoor-facility' },
        { label: 'Miscellaneous', value: 'miscellaneous' },
      ],
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
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
  endpoints: [
    {
      path: '/expenditures-stats',
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

          const result = await req.payload.db.drizzle.execute(sql`
            SELECT
              COALESCE(SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END), 0) AS "maintenance",
              COALESCE(SUM(CASE WHEN type = 'utility-bill' THEN amount ELSE 0 END), 0) AS "utilityBill",
              COALESCE(SUM(CASE WHEN type = 'equipment-purchase' THEN amount ELSE 0 END), 0) AS "equipmentPurchase",
              COALESCE(SUM(CASE WHEN type = 'tournament-expenses' THEN amount ELSE 0 END), 0) AS "tournamentExpenses",
              COALESCE(SUM(CASE WHEN type = 'indoor-facility' THEN amount ELSE 0 END), 0) AS "indoorFacility",
              COALESCE(SUM(CASE WHEN type = 'miscellaneous' THEN amount ELSE 0 END), 0) AS "miscellaneous"
            FROM expenditures
            WHERE 1=1
            ${start && end ? sql`AND date >= ${start} AND date <= ${end}` : sql``}
          `)

          const data = result.rows?.[0] || {}
          return Response.json({
            maintenance: Number(data.maintenance || 0),
            utilityBill: Number(data.utilityBill || 0),
            equipmentPurchase: Number(data.equipmentPurchase || 0),
            tournamentExpenses: Number(data.tournamentExpenses || 0),
            indoorFacility: Number(data.indoorFacility || 0),
            miscellaneous: Number(data.miscellaneous || 0),
            filter: month && year ? { month, year } : 'all',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch expenditure stats' }, { status: 500 })
        }
      },
    },
    {
      path: '/overall-expenditures-stats',
      method: 'get',
      handler: async (req: any) => {
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

          const dateFilter = (col: string) =>
            start && end
              ? sql`AND ${sql.raw(col)} >= ${start} AND ${sql.raw(col)} <= ${end}`
              : sql``

          // 1. Fetch all data in parallel
          const [coachSalaries, staffSalaries, managerSalaries, generalExpenditures] =
            await Promise.all([
              req.payload.db.drizzle.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN status = 'paid' THEN salary ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN salary ELSE 0 END), 0) as due
          FROM coach_salaries_salaries WHERE 1=1 ${dateFilter('payment_month')}`),

              req.payload.db.drizzle.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN status = 'paid' THEN salary ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN salary ELSE 0 END), 0) as due
          FROM staffs_salaries WHERE 1=1 ${dateFilter('payment_month')}`),

              req.payload.db.drizzle.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN status = 'paid' THEN salary ELSE 0 END), 0) as paid,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN salary ELSE 0 END), 0) as due
          FROM managers_salaries WHERE 1=1 ${dateFilter('payment_month')}`),

              req.payload.db.drizzle.execute(sql`
          SELECT
            COALESCE(SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END), 0) AS maintenance,
            COALESCE(SUM(CASE WHEN type = 'utility-bill' THEN amount ELSE 0 END), 0) AS utilityBill,
            COALESCE(SUM(CASE WHEN type = 'equipment-purchase' THEN amount ELSE 0 END), 0) AS equipmentPurchase,
            COALESCE(SUM(CASE WHEN type = 'tournament-expenses' THEN amount ELSE 0 END), 0) AS tournamentExpenses,
            COALESCE(SUM(CASE WHEN type = 'indoor-facility' THEN amount ELSE 0 END), 0) AS indoorFacility,
            COALESCE(SUM(CASE WHEN type = 'miscellaneous' THEN amount ELSE 0 END), 0) AS miscellaneous
          FROM expenditures WHERE 1=1 ${dateFilter('date')}`),
            ])

          // 2. Parse Results
          const cData = coachSalaries.rows[0]
          const sData = staffSalaries.rows[0]
          const mData = managerSalaries.rows[0]
          const eData = generalExpenditures.rows[0]

          const totals = {
            // Salary Breakdown
            coachSalaryPaid: Number(cData.paid),
            coachSalaryDue: Number(cData.due),
            staffSalaryPaid: Number(sData.paid),
            staffSalaryDue: Number(sData.due),
            managerSalaryPaid: Number(mData.paid),
            managerSalaryDue: Number(mData.due),
            // General Expenditure Breakdown
            maintenance: Number(eData.maintenance),
            utilityBill: Number(eData.utilityBill),
            equipmentPurchase: Number(eData.equipmentPurchase),
            tournamentExpenses: Number(eData.tournamentExpenses),
            indoorFacility: Number(eData.indoorFacility),
            miscellaneous: Number(eData.miscellaneous),
          }

          const totalPaidSalaries =
            totals.coachSalaryPaid + totals.staffSalaryPaid + totals.managerSalaryPaid
          const totalDueSalaries =
            totals.coachSalaryDue + totals.staffSalaryDue + totals.managerSalaryDue
          const totalGeneralExp =
            totals.maintenance +
            totals.utilityBill +
            totals.equipmentPurchase +
            totals.tournamentExpenses +
            totals.indoorFacility +
            totals.miscellaneous

          const grandTotalExpenditure = totalPaidSalaries + totalGeneralExp

          return Response.json({
            summary: {
              grandTotalExpenditure,
              totalSalaryDue: totalDueSalaries,
              totalOperationalCost: grandTotalExpenditure + totalDueSalaries,
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
