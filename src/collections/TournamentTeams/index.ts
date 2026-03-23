import { CollectionConfig } from 'payload'

export const TournamentTeams: CollectionConfig = {
  slug: 'tournament-teams',
  labels: {
    singular: '🧑‍🤝‍🧑 Tournament Team',
    plural: '🧑‍🤝‍🧑 Tournament Teams',
  },
  admin: {
    useAsTitle: 'tournamentId',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'tournamentId',
      type: 'relationship',
      relationTo: 'tournaments',
      required: true,
    },
    {
      name: 'teams',
      type: 'array',
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'teamName',
              type: 'text',
              required: true,
              unique: true,
            },
            {
              name: 'playerOne',
              type: 'relationship',
              relationTo: 'users',
              required: true,
            },
            {
              name: 'playerTwo',
              type: 'relationship',
              relationTo: 'users',
              required: true,
            },
          ],
        },
      ],
    },
  ],
}
