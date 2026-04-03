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
    create: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'coach') return true
      return {
        'user.id': { equals: user.id },
      }
    },
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
      filterOptions: () => {
        return {
          status: {
            equals: 'open',
          },
        }
      },
      validate: async (val: any, { data, req, operation }: any) => {
        // 1. Basic required check (if not already handled by 'required: true')
        if (!val) return 'Tournament selection is required.'

        // 2. Only perform heavy lookups during creation or if the tournament is being changed
        if (operation === 'create' || operation === 'update') {
          try {
            // Fetch tournament status
            const tournament = await req.payload.findByID({
              collection: 'tournaments',
              id: val,
              depth: 0, // Keeps it fast
            })

            if (!tournament) return 'Selected tournament not found.'

            // Throw error if status is not open
            if (tournament.status !== 'open') {
              return 'Registration is closed for this tournament.'
            }

            // 3. Check for Duplicate Registration
            // Note: 'data.user' might be an ID or an object depending on the context
            const userId = typeof data?.user === 'object' ? data.user.id : data?.user

            if (userId) {
              const existing = await req.payload.find({
                collection: 'tournament-registrations',
                depth: 0,
                where: {
                  and: [{ tournament: { equals: val } }, { user: { equals: userId } }],
                },
                // If updating, ignore the current document itself
                ...(operation === 'update' && data.id
                  ? {
                      where: {
                        and: [
                          { tournament: { equals: val } },
                          { user: { equals: userId } },
                          { id: { not_equals: data.id } },
                        ],
                      },
                    }
                  : {}),
                limit: 1,
              })

              if (existing.totalDocs > 0) {
                return 'This user is already registered for this tournament.'
              }
            }
          } catch (err) {
            return 'An error occurred during validation.'
          }
        }

        return true
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ req }) => {
        return req.user?.id
      },
      access: {
        create: ({ req }) => {
          return (
            req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'coach'
          )
        },
      },
    },
    {
      name: 'registrationDate',
      type: 'date',
      defaultValue: new Date().toISOString(),
      access: {
        create: ({ req }) => {
          return (
            req.user?.role === 'admin' || req.user?.role === 'manager' || req.user?.role === 'coach'
          )
        },
      },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      access: {
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
      },
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
  ],
  hooks: {
    afterRead: [
      ({ doc }: any) => {
        if (doc.user && typeof doc.user === 'object') {
          delete doc.user.collection
          delete doc.user.sessions
        }
        return doc
      },
    ],
  },
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
