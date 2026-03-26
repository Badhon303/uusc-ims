import { CollectionConfig } from 'payload'

export const BookingPayments: CollectionConfig = {
  slug: 'booking-payments',
  labels: {
    singular: '💴 Booking Payment',
    plural: '💴 Booking Payments',
  },
  admin: {
    useAsTitle: 'booking',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
  },
  fields: [
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'court-bookings',
      required: true,
      unique: true,
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
      ],
    },
  ],
}
