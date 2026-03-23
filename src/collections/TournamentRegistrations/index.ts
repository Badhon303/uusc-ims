import { CollectionConfig } from 'payload'

export const TournamentRegistrations: CollectionConfig = {
  slug: 'tournament-registrations',
  labels: {
    singular: '🪅 Tournament Registration',
    plural: '🪅 Tournament Registrations',
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
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'registrationDate',
      type: 'date',
      required: true,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
  ],
}
