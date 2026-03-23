import { CollectionConfig } from 'payload'

export const TournamentTeams: CollectionConfig = {
  slug: 'tournament-teams',
  labels: {
    singular: '🧑‍🤝‍🧑 Tournament Team',
    plural: '🧑‍🤝‍🧑 Tournament Teams',
  },
  admin: {
    useAsTitle: 'teamName',
  },
  fields: [
    {
      name: 'tournament',
      type: 'relationship',
      relationTo: 'tournaments',
      required: true,
    },
    {
      name: 'teamName',
      type: 'text',
      required: true,
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
}
