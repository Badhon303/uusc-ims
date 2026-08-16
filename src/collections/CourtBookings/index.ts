import { isAuthenticated } from '@/utils/access/isAuthenticated'
import { CollectionConfig, Where } from 'payload'
import { tenantScopedUserFilter } from '@/utils/access/tenantFilterOptions'

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
    read: isAuthenticated,
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
      defaultValue: ({ req }) => req.user?.id,
      filterOptions: ({ req }) => tenantScopedUserFilter(req),
      access: {
        update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'manager',
        create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'manager',
      },
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
              name: 'courts',
              type: 'relationship',
              relationTo: 'courts',
              required: true,
              hasMany: true,
            },
            {
              name: 'bookingDate',
              type: 'date',
              required: true,
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
  endpoints: [
    {
      path: '/weekly-schedule',
      method: 'get',
      handler: async (req) => {
        const { weekOffset = 0 }: any = req.query

        const offset = parseInt(weekOffset) || 0

        // 🧠 Normalize date
        const normalizeDate = (date: Date) => {
          const d = new Date(date)
          d.setHours(0, 0, 0, 0)
          return d
        }

        const today = new Date()

        // 🗓️ Calculate week start based on offset
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() + offset * 7)
        const normalizedWeekStart = normalizeDate(weekStart)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        const normalizedWeekEnd = normalizeDate(weekEnd)

        // 🗓️ Build week map
        const weekMap: Record<string, { date: string; bookings: any[] }> = {}

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

        days.forEach((dayName, index) => {
          const date = new Date(weekStart)
          const diff = index - weekStart.getDay()
          date.setDate(weekStart.getDate() + diff)

          weekMap[dayName] = {
            date: date.toISOString().split('T')[0],
            bookings: [],
          }
        })

        // 🔍 Fetch ONLY confirmed bookings within week range
        const result = await req.payload.find({
          collection: 'court-bookings',
          where: {
            and: [
              {
                confirmed: {
                  equals: true, // ✅ only confirmed bookings
                },
              },
              {
                'bookings.bookingDate': {
                  greater_than_equal: normalizedWeekStart.toISOString(),
                  less_than_equal: normalizedWeekEnd.toISOString(),
                },
              },
            ],
          },
          depth: 2,
          limit: 500,
          pagination: false,
          req,
          overrideAccess: false,
        })

        const docs = result.docs || []

        // 🔁 Map bookings into weekMap
        docs.forEach((doc: any) => {
          // 🔒 Optional safety (extra protection)
          if (!doc.confirmed) return

          const user = doc.user

          doc.bookings?.forEach((booking: any) => {
            const bookingDate = new Date(booking.bookingDate)
            const dayName = days[bookingDate.getDay()]

            if (!weekMap[dayName]) return

            weekMap[dayName].bookings.push({
              bookingId: doc.id,
              title: doc.title,
              user,
              courts: booking.courts,
              startTime: booking.startTime,
              endTime: booking.endTime,
              confirmed: doc.confirmed,
            })
          })
        })

        // 🔽 Sort bookings by time
        Object.keys(weekMap).forEach((day) => {
          weekMap[day].bookings.sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          )
        })

        return Response.json({
          weekOffset: offset,
          weekStart: normalizedWeekStart,
          weekEnd: normalizedWeekEnd,
          weekSchedule: weekMap,
        })
      },
    },
  ],
}
