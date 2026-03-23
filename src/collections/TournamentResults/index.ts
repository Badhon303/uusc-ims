import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const TournamentResults: CollectionConfig = {
  slug: 'tournament-results',
  labels: {
    singular: '🏆 Tournament Result',
    plural: '🏆 Tournament Results',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'tournamentId',
      type: 'relationship',
      relationTo: 'tournaments',
      required: true,
    },
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
}
