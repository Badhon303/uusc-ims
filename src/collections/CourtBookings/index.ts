import { CollectionConfig } from 'payload'

export const CourtBookings: CollectionConfig = {
  slug: 'courtBookings',
  labels: {
    singular: '🛒 Court Booking',
    plural: '🛒 Court Bookings',
  },
  admin: {
    useAsTitle: 'user',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'court',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
    },
    {
      name: 'bookings',
      type: 'array',
      required: true,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'bookingDate',
              type: 'date',
              required: true,
            },
            // Booking time should not be less then current time and One hour
            {
              name: 'startTime',
              type: 'date',
              required: true,
            },
            {
              name: 'endTime',
              type: 'date',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'totalPrice',
      type: 'number',
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
