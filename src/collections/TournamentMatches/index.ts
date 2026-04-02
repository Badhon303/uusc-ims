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
      name: 'matches',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'teamOne',
              type: 'text',
              required: true,
              admin: {
                components: {
                  Field: '@/components/MatchTeamSelectField',
                },
              },
            },
            {
              name: 'teamTwo',
              type: 'text',
              required: true,
              admin: {
                components: {
                  Field: '@/components/MatchTeamSelectField',
                },
              },
            },
            {
              name: 'winner',
              type: 'text',
              admin: {
                components: {
                  Field: '@/components/MatchTeamSelectField',
                },
              },
            },
          ],
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
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
          required: true,
        },
        {
          name: 'scores',
          type: 'array',
          fields: [
            {
              name: 'teamOneScore',
              type: 'number',
            },
            {
              name: 'teamTwoScore',
              type: 'number',
            },
          ],
        },
      ],
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
