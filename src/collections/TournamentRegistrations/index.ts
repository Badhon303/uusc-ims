import { sql } from 'drizzle-orm'
import { CollectionConfig } from 'payload'

export const TournamentRegistrations: CollectionConfig = {
  slug: 'tournament-registrations',
  labels: {
    singular: '🪅 Tournament Registration',
    plural: '🪅 Tournament Registrations',
  },
  admin: {
    useAsTitle: 'tournament',
    group: '🏆 Tournament',
    components: {
      beforeList: ['@/components/TournamentReports'], // This places the cards above the list
    },
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'tournament',
      type: 'relationship',
      relationTo: 'tournaments',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'registrationDate',
      type: 'date',
      required: true,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
  ],
  endpoints: [
    {
      path: '/income-from-tournament-registrations',
      method: 'get',
      handler: async (req: any) => {
        if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
          return Response.json({ error: 'forbidden' }, { status: 403 })
        }
        try {
          const { tournamentId } = req.query

          const result = await req.payload.db.drizzle.execute(sql`
          SELECT
            -- Sum of fees for 'paid' registrations
            COALESCE(SUM(
              CASE WHEN tr.payment_status = 'paid' THEN t.registration_fee ELSE 0 END
            ), 0) as "totalPaid",
            
            -- Sum of fees for 'unpaid' registrations
            COALESCE(SUM(
              CASE WHEN tr.payment_status = 'unpaid' THEN t.registration_fee ELSE 0 END
            ), 0) as "totalDue",

            -- Count total number of participants
            COUNT(tr.id) as "totalRegistrations"
            
          FROM tournament_registrations tr
          JOIN tournaments t ON tr.tournament_id = t.id
          WHERE 1=1
          ${tournamentId ? sql` AND tr.tournament_id = ${tournamentId}` : sql``}
        `)

          const data = result.rows?.[0] || {}

          return Response.json({
            totalPaid: Number(data.totalPaid || 0),
            totalDue: Number(data.totalDue || 0),
            totalRegistrations: Number(data.totalRegistrations || 0),
            tournamentId: tournamentId || 'all',
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch booking income stats' }, { status: 500 })
        }
      },
    },
  ],
}
