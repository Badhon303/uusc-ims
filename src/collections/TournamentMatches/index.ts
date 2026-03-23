import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const TournamentMatches: CollectionConfig = {
  slug: 'tournament-matches',
  labels: {
    singular: 'Tournament Match',
    plural: 'Tournament Matches',
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
      name: 'teamOneId',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,
    },
    {
      name: 'teamTwoId',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,
    },
    {
      name: 'courtId',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
    },
    {
      name: 'winnerId',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,
    },
    {
      name: 'scheduledTime',
      type: 'date',
      required: true,
    },
    {
      name: 'teamOneScore',
      type: 'number',
      required: true,
    },
    {
      name: 'teamTwoScore',
      type: 'number',
      required: true,
    },
  ],
}
