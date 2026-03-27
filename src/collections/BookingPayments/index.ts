import { sql } from 'drizzle-orm'
import { CollectionConfig } from 'payload'

export const BookingPayments: CollectionConfig = {
  slug: 'booking-payments',
  labels: {
    singular: '💴 Booking Payment',
    plural: '💴 Booking Payments',
  },
  admin: {
    useAsTitle: 'booking',
    group: '💳 Payments & Packages',
    components: {
      beforeList: ['@/components/BookingReports'], // This places the cards above the list
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
      return ['admin', 'manager'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'court-bookings',
      required: true,
      unique: true,
      hasMany: false,
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
  ],
  endpoints: [
    {
      path: '/income-from-bookings',
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

          // We join booking_payments with the court_bookings array table
          const result = await req.payload.db.drizzle.execute(sql`
          SELECT
            -- Sum paid bookings
            COALESCE(SUM(
              CASE WHEN bp.payment_status = 'paid' THEN bp.total_amount ELSE 0 END
            ), 0) as "totalBookingIncome",
            
            -- Sum unpaid bookings
            COALESCE(SUM(
              CASE WHEN bp.payment_status = 'unpaid' THEN bp.total_amount ELSE 0 END
            ), 0) as "totalBookingDue"
            
          FROM booking_payments bp
          INNER JOIN court_bookings_bookings cbb ON cbb._parent_id = bp.booking_id
          WHERE 1=1
          ${start ? sql` AND cbb.booking_date >= ${start} AND cbb.booking_date <= ${end}` : sql``}
        `)

          const data = result.rows?.[0] || {}

          return Response.json({
            totalBookingIncome: Number(data.totalBookingIncome || 0),
            totalBookingDue: Number(data.totalBookingDue || 0),
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch booking income stats' }, { status: 500 })
        }
      },
    },
  ],
}
