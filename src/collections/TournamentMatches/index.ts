// collections/TournamentMatches.ts
import { CollectionConfig } from 'payload'

export const TournamentMatches: CollectionConfig = {
  slug: 'tournament-matches',
  labels: {
    singular: '🫎 Tournament Match',
    plural: '🫎 Tournament Matches',
  },
  admin: {
    useAsTitle: 'tournament',
    group: '🏆 Tournament',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager', 'coach'].includes(user.role)
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
    },
    {
      name: 'teamOne',
      type: 'text',
      required: true,
      admin: {
        components: {
          Field: '@/components/TeamSelectField',
        },
      },
    },
    {
      name: 'teamTwo',
      type: 'text',
      required: true,
      admin: {
        condition: (_, siblingData) => !!siblingData.teamOne,
        components: {
          Field: '@/components/TeamSelectField',
        },
      },
    },
    {
      name: 'winner',
      type: 'text',
      required: true,
      admin: {
        condition: (_, siblingData) => !!siblingData.teamOne && !!siblingData.teamTwo,
        components: {
          Field: '@/components/TeamSelectField',
        },
      },
      // Update the validation signature here
      validate: (value: any, { data }: any) => {
        // 1. Handle potential empty values (Payload passes null/undefined sometimes)
        if (!value || typeof value !== 'string') {
          return 'Winner is required'
        }

        // 2. Perform your logic
        if (value !== data?.teamOne && value !== data?.teamTwo) {
          return 'Winner must be Team One or Team Two'
        }

        return true
      },
    },
    {
      name: 'court',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
    },
    {
      name: 'scheduledTime',
      type: 'date',
      required: true,
    },
    {
      name: 'teamOneScore',
      type: 'number',
      required: true,
    },
    {
      name: 'teamTwoScore',
      type: 'number',
      required: true,
    },
  ],
  endpoints: [
    {
      path: '/team-names',
      method: 'get',
      handler: async (req) => {
        const { tournamentId } = req.query

        if (!tournamentId) {
          return Response.json({ error: 'tournamentId is required' }, { status: 400 })
        }

        try {
          // Payload exposes the raw pg pool via req.payload.db.pool
          const result = await req.payload.db.pool.query(
            `
            SELECT
              ttt.id,
              ttt.team_name AS "teamName"
            FROM tournament_teams tt
            JOIN tournament_teams_teams ttt ON ttt._parent_id = tt.id
            WHERE tt.tournament_id = $1
            ORDER BY ttt.team_name ASC
            `,
            [tournamentId],
          )

          return Response.json({ teams: result.rows }, { status: 200 })
        } catch (err) {
          console.error('SQL Error:', err)
          return Response.json({ error: 'Failed to fetch team names' }, { status: 500 })
        }
      },
    },
  ],
}
