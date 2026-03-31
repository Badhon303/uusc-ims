import { CollectionConfig } from 'payload'

export const TournamentTeams: CollectionConfig = {
  slug: 'tournament-teams',
  labels: {
    singular: '🧑‍🤝‍🧑 Tournament Team',
    plural: '🧑‍🤝‍🧑 Tournament Teams',
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
      filterOptions: () => {
        return {
          status: {
            equals: 'open',
          },
        }
      },
    },
    {
      name: 'teams',
      type: 'array',
      fields: [
        {
          name: 'teamName',
          type: 'text',
          required: true,
        },
        {
          name: 'players',
          label: {
            singular: 'Player',
            plural: 'Players',
          },
          type: 'relationship',
          relationTo: 'users',
          required: true,
          hasMany: true,
          validate: (value: any) => {
            if (!value || value.length === 0) {
              return 'At least one player is required'
            }
            if (value.length > 2) {
              return 'A team can have a maximum of 2 players'
            }

            // Check for duplicate players
            const playerIds = value.map((player: any) => {
              return typeof player === 'object' && player !== null ? player.id : player
            })

            const uniquePlayers = new Set(playerIds)
            if (uniquePlayers.size !== playerIds.length) {
              return 'Duplicate players are not allowed in the same team'
            }

            return true
          },
        },
      ],
    },
  ],
}
