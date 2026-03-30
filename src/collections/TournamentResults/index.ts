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
    },
    {
      name: 'teamPositions',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'teamId',
          type: 'relationship',
          relationTo: 'tournament-teams',
          required: true,
        },
        {
          name: 'position',
          type: 'number',
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
}
