import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Expenditure: CollectionConfig = {
  slug: 'expenditure',
  labels: {
    singular: '🐒 Expenditure',
    plural: '🐒 Expenditures',
  },
  admin: {
    useAsTitle: 'title',
    group: '💼 Back Office',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'UtilityBill', value: 'utility-bill' },
        { label: 'EquipmentPurchase', value: 'equipment-purchase' },
        { label: 'TournamentExpenses', value: 'tournament-expenses' },
        { label: 'IndoorFacility', value: 'indoor-facility' },
        { label: 'Miscellaneous', value: 'miscellaneous' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
}
