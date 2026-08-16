import { isAuthenticated } from '@/utils/access/isAuthenticated'
import type { CollectionConfig } from 'payload'

/**
 * Batched player resolver shared with the tournament matches collection.
 * Fetches all referenced user IDs in a single query and returns a map keyed
 * by user ID, avoiding per-player `findByID` calls.
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
