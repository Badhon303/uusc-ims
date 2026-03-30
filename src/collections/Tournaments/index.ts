import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const Tournaments: CollectionConfig = {
  slug: 'tournaments',
  labels: {
    singular: '🐲 Tournament',
    plural: '🐲 Tournaments',
  },
  admin: {
    useAsTitle: 'name',
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
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'tournamentType',
      type: 'select',
      required: true,
      options: [
        { label: 'Academy', value: 'academy' },
        { label: 'Members', value: 'members' },
        { label: 'Academy & Members', value: 'academy&members' },
        { label: 'Open For All', value: 'openForAll' },
      ],
    },
    {
      name: 'registrationFee',
      type: 'number',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'registrationStartDate',
      type: 'date',
      required: true,
    },
    {
      name: 'registrationEndDate',
      type: 'date',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    },
  ],
}
