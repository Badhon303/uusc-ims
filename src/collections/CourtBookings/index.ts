import { CollectionConfig } from 'payload'

export const CourtBookings: CollectionConfig = {
  slug: 'court-bookings',
  labels: {
    singular: '🛒 Court Booking',
    plural: '🛒 Court Bookings',
  },
  admin: {
    useAsTitle: 'title',
    group: '📅 Schedule',
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager') return true
      return {
        'user.id': { equals: user.id },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager') return true
      return {
        'user.id': { equals: user.id },
      }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          async ({ data, req }: any) => {
            // 1. Get the booking dates
            const dates =
              data.bookings?.map((booking: any) => booking.bookingDate).join(', ') || 'No Date'

            // 2. Fetch the user's name if a user is linked
            let userName = 'Unknown User'
            if (data.user) {
              const userDoc = await req.payload.findByID({
                collection: 'users',
                id: typeof data.user === 'object' ? data.user.id : data.user,
              })

              if (userDoc) {
                userName = userDoc.name || userDoc.email || 'User'
              }
            }

            // 3. Combine them: "John Doe - 2024-10-24"
            return `${userName} - ${dates}`
          },
        ],
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'courts',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
      hasMany: true,
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
      name: 'confirmed',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
      },
    },
  ],
}
