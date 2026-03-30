import { CollectionConfig, Where } from 'payload'

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
      // Regular users: must own the doc AND it must not be confirmed
      const constraint: Where = {
        and: [
          {
            'user.id': {
              equals: user.id,
            },
          },
          {
            confirmed: {
              not_equals: true,
            },
          },
        ],
      }
      return constraint
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager') return true
      const constraint: Where = {
        and: [
          {
            'user.id': {
              equals: user.id,
            },
          },
          {
            confirmed: {
              not_equals: true,
            },
          },
        ],
      }
      return constraint
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
            // 1. Handle User Name
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

            // 2. Handle Dates and Title Logic
            if (data.bookings && data.bookings.length > 0) {
              const firstBooking = data.bookings[0]
              const bDate = new Date(firstBooking.bookingDate)

              const dateString = bDate.toISOString().split('T')[0] // YYYY-MM-DD
              // convert dateString Like March 27th 202
              const formattedDate = bDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })

              // 3. Return Title: "User - Date - Time"
              return `${userName} - ${formattedDate}`
            }

            return `${userName} - No Date`
          },
        ],
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
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
      hooks: {
        beforeChange: [
          ({ value }) => {
            // Syncs the YMD of startTime/endTime with bookingDate
            return value?.map((block: any) => {
              const d = new Date(block.bookingDate)
              const syncTime = (timeInput: string | Date) => {
                const t = new Date(timeInput)
                t.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
                return t.toISOString()
              }
              return {
                ...block,
                startTime: syncTime(block.startTime),
                endTime: syncTime(block.endTime),
              }
            })
          },
        ],
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'bookingDate',
              type: 'date',
              required: true,
              validate: (val: Date | null | undefined) => {
                if (!val) return 'Booking date is required'

                const selectedDate = new Date(val)
                const today = new Date()

                // Normalize to midnight for date-only comparison
                today.setHours(0, 0, 0, 0)
                selectedDate.setHours(0, 0, 0, 0)

                if (selectedDate < today) {
                  return 'You cannot book a date in the past.'
                }
                return true
              },
            },
            {
              name: 'startTime',
              type: 'date',
              required: true,
              admin: {
                date: {
                  pickerAppearance: 'timeOnly',
                },
              },
            },
            {
              name: 'endTime',
              type: 'date',
              required: true,
              admin: {
                date: {
                  pickerAppearance: 'timeOnly',
                },
              },
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
        update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'manager',
        create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'manager',
      },
    },
  ],
}
