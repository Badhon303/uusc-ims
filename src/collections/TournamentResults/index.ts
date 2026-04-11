import { CollectionConfig } from 'payload'

export const TournamentResults: CollectionConfig = {
  slug: 'tournament-results',
  labels: {
    singular: '🏆 Tournament Result',
    plural: '🏆 Tournament Results',
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
      unique: true,
    },
    {
      name: 'teamPositions',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'team',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            components: {
              Field: '@/components/ResultTeamSelectField',
            },
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'position',
              type: 'number',
              unique: true,
              required: true,
            },
            {
              name: 'prizeAmount',
              type: 'number',
              required: true,
            },
          ],
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/with-results-details',
      method: 'get',
      handler: async (req) => {
        const { tournamentId } = req.query

        if (!tournamentId) {
          return Response.json({ error: 'tournamentId is required' }, { status: 400 })
        }

        try {
          // First, get the tournament results
          const results = await req.payload.find({
            collection: 'tournament-results',
            where: {
              tournament: {
                equals: tournamentId,
              },
            },
            depth: 2,
          })

          // Get all team details for this tournament
          const tournamentTeams = await req.payload.find({
            collection: 'tournament-teams',
            where: {
              tournament: {
                equals: tournamentId,
              },
            },
            depth: 2,
          })

          // Create a map of team names to their details
          const teamDetailsMap = new Map()

          for (const tournamentTeam of tournamentTeams.docs) {
            if (tournamentTeam.teams && Array.isArray(tournamentTeam.teams)) {
              for (const team of tournamentTeam.teams) {
                // Get full player details
                const playersWithDetails = []
                if (team.players && Array.isArray(team.players)) {
                  for (const player of team.players) {
                    const playerData =
                      typeof player === 'object' && player !== null
                        ? player
                        : await req.payload.findByID({
                            collection: 'users',
                            id: player,
                            depth: 0,
                          })

                    playersWithDetails.push({
                      id: playerData.id,
                      name: playerData.name || playerData.email,
                      email: playerData.email,
                      role: playerData.role,
                    })
                  }
                }

                teamDetailsMap.set(team.teamName, {
                  id: team.id,
                  teamName: team.teamName,
                  players: playersWithDetails,
                })
              }
            }
          }

          // Enhance results with team details
          const enhancedDocs = results.docs.map((result) => ({
            ...result,
            teamPositions:
              result.teamPositions?.map((teamPosition) => {
                const { team, ...rest } = teamPosition
                return {
                  ...rest,
                  team: team,
                  teamDetails: teamDetailsMap.get(team) || null,
                }
              }) || [],
          }))

          return Response.json(
            {
              ...results,
              docs: enhancedDocs,
            },
            { status: 200 },
          )
        } catch (err) {
          console.error('Error:', err)
          return Response.json(
            { error: 'Failed to fetch tournament results with team details' },
            { status: 500 },
          )
        }
      },
    },
  ],
}
