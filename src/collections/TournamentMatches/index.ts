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
          type: 'row',
          fields: [
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
          ],
        },
        {
          name: 'scores',
          type: 'array',
          maxRows: 3,
          minRows: 1,
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'teamOneScore',
                  type: 'number',
                  max: 30,
                  min: 0,
                },
                {
                  name: 'teamTwoScore',
                  type: 'number',
                  max: 30,
                  min: 0,
                },
              ],
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
          // Use Payload's query instead of raw SQL
          const tournamentTeams = await req.payload.find({
            collection: 'tournament-teams',
            where: {
              tournament: {
                equals: tournamentId,
              },
            },
            depth: 2,
          })

          const teams = []

          for (const tournamentTeam of tournamentTeams.docs) {
            if (tournamentTeam.teams && Array.isArray(tournamentTeam.teams)) {
              for (const team of tournamentTeam.teams) {
                // Get player details for each team
                const players = []
                if (team.players && Array.isArray(team.players)) {
                  for (const player of team.players) {
                    const playerData =
                      typeof player === 'object'
                        ? player
                        : await req.payload.findByID({
                            collection: 'users',
                            id: player,
                          })
                    players.push({
                      id: playerData.id,
                      name: playerData.name || playerData.email || `Player ${playerData.id}`,
                    })
                  }
                }

                teams.push({
                  id: team.id,
                  teamName: team.teamName,
                  players: players,
                })
              }
            }
          }

          return Response.json({ teams }, { status: 200 })
        } catch (err) {
          console.error('Error:', err)
          return Response.json({ error: 'Failed to fetch team names' }, { status: 500 })
        }
      },
    },
    {
      path: '/with-team-details',
      method: 'get',
      handler: async (req) => {
        const { tournamentId } = req.query

        if (!tournamentId) {
          return Response.json({ error: 'tournamentId is required' }, { status: 400 })
        }

        try {
          // First, get the matches
          const matches = await req.payload.find({
            collection: 'tournament-matches',
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

          // Enhance matches with team details
          const enhancedDocs = matches.docs.map((match) => ({
            ...match,
            matches:
              match.matches?.map((m) => {
                const { teamOne, teamTwo, winner, ...rest } = m
                return {
                  ...rest,
                  teamOneDetails: teamDetailsMap.get(teamOne) || null,
                  teamTwoDetails: teamDetailsMap.get(teamTwo) || null,
                  winnerDetails: teamDetailsMap.get(winner) || null,
                }
              }) || [],
          }))
          return Response.json(
            {
              ...matches,
              docs: enhancedDocs,
            },
            { status: 200 },
          )
        } catch (err) {
          console.error('Error:', err)
          return Response.json(
            { error: 'Failed to fetch matches with team details' },
            { status: 500 },
          )
        }
      },
    },
  ],
}
