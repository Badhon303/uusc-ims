import { isAuthenticated } from '@/utils/access/isAuthenticated'
// collections/TournamentMatches.ts
import type { CollectionConfig } from 'payload'

/**
 * Resolves player details for a set of tournament teams in a single batched
 * user query, returning a map keyed by user ID. Avoids the per-player
 * `findByID` calls that produced an N+1 in the original implementation.
 */
const buildPlayerMap = async (
  req: any,
  tournamentTeams: any[],
): Promise<
  Map<number | string, { id: number | string; name: string; email?: string; role?: string }>
> => {
  const playerIds = new Set<number | string>()

  for (const tournamentTeam of tournamentTeams) {
    if (tournamentTeam.teams && Array.isArray(tournamentTeam.teams)) {
      for (const team of tournamentTeam.teams) {
        if (team.players && Array.isArray(team.players)) {
          for (const player of team.players) {
            if (typeof player !== 'object' && player) {
              playerIds.add(player)
            }
          }
        }
      }
    }
  }

  const playerMap = new Map<number | string, any>()

  if (!playerIds.size) {
    return playerMap
  }

  const ids = Array.from(playerIds)
  const { docs: users } = await req.payload.find({
    collection: 'users',
    where: { id: { in: ids } },
    limit: ids.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { name: true, email: true, role: true },
  })

  for (const u of users as any[]) {
    playerMap.set(u.id, {
      id: u.id,
      name: u.name || u.email || `Player ${u.id}`,
      email: u.email,
      role: u.role,
    })
  }

  return playerMap
}

const resolvePlayers = (players: any[] | undefined, playerMap: Map<number | string, any>) => {
  if (!players || !Array.isArray(players)) return []

  return players.map((player) => {
    if (typeof player === 'object' && player !== null) {
      return {
        id: player.id,
        name: player.name || player.email || `Player ${player.id}`,
      }
    }

    const resolved = playerMap.get(player)
    return resolved || { id: player, name: `Player ${player}` }
  })
}

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
    read: isAuthenticated,
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
            depth: 1,
            limit: 100,
            pagination: false,
            req,
            overrideAccess: false,
          })

          const playerMap = await buildPlayerMap(req, tournamentTeams.docs)

          const teams = []

          for (const tournamentTeam of tournamentTeams.docs) {
            if (tournamentTeam.teams && Array.isArray(tournamentTeam.teams)) {
              for (const team of tournamentTeam.teams) {
                teams.push({
                  id: team.id,
                  teamName: team.teamName,
                  players: resolvePlayers(team.players, playerMap),
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
            depth: 1,
            limit: 100,
            pagination: false,
            req,
            overrideAccess: false,
          })

          // Get all team details for this tournament
          const tournamentTeams = await req.payload.find({
            collection: 'tournament-teams',
            where: {
              tournament: {
                equals: tournamentId,
              },
            },
            depth: 1,
            limit: 100,
            pagination: false,
            req,
            overrideAccess: false,
          })

          const playerMap = await buildPlayerMap(req, tournamentTeams.docs)

          // Create a map of team names to their details
          const teamDetailsMap = new Map()

          for (const tournamentTeam of tournamentTeams.docs) {
            if (tournamentTeam.teams && Array.isArray(tournamentTeam.teams)) {
              for (const team of tournamentTeam.teams) {
                const playersWithDetails = (team.players || []).map((player: any) => {
                  if (typeof player === 'object' && player !== null) {
                    return {
                      id: player.id,
                      name: player.name || player.email,
                      email: player.email,
                      role: player.role,
                    }
                  }
                  const resolved = playerMap.get(player)
                  return resolved || { id: player, name: `Player ${player}` }
                })

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
