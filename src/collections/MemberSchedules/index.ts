import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig } from 'payload'

export const MemberSchedules: CollectionConfig = {
  slug: 'member-schedules',
  labels: {
    singular: '🦑 Member Schedule',
    plural: '🦑 Member Schedules',
  },
  admin: {
    useAsTitle: 'shiftName',
    group: '📅 Schedule',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'shiftName',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'schedules',
      type: 'array',
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
              name: 'daysOfWeek',
              type: 'select',
              required: true,
              hasMany: true,
              options: [
                { label: 'Saturday', value: 'saturday' },
                { label: 'Sunday', value: 'sunday' },
                { label: 'Monday', value: 'monday' },
                { label: 'Tuesday', value: 'tuesday' },
                { label: 'Wednesday', value: 'wednesday' },
                { label: 'Thursday', value: 'thursday' },
                { label: 'Friday', value: 'friday' },
              ],
            },
          ],
        },
        {
          type: 'row',
          fields: [
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
      name: 'offDays',
      type: 'array',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Single Day', value: 'single' },
            { label: 'Range', value: 'range' },
          ],
          defaultValue: 'single',
        },
        {
          name: 'date',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'single',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'from',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'range',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'to',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData.type === 'range',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'reason',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/week-schedules',
      method: 'get',
      handler: async (req) => {
        const { shiftName }: any = req.query

        if (!shiftName) {
          return Response.json({ message: 'shiftName is required' }, { status: 400 })
        }

        const result = await req.payload.find({
          collection: 'member-schedules',
          where: {
            shiftName: {
              equals: shiftName,
            },
          },
          depth: 2,
          limit: 1,
        })

        const scheduleDoc = result.docs[0]

        if (!scheduleDoc) {
          return Response.json({ message: 'No schedule found' }, { status: 404 })
        }

        const rawSchedules = scheduleDoc.schedules || []
        const rawOffDays = scheduleDoc.offDays || []

        // 🧠 Normalize date
        const normalizeDate = (date: Date) => {
          const d = new Date(date)
          d.setHours(0, 0, 0, 0)
          return d
        }

        const today = new Date()
        const weekStart = normalizeDate(today)

        const weekEnd = new Date(today)
        weekEnd.setDate(today.getDate() + 6)
        const normalizedWeekEnd = normalizeDate(weekEnd)

        // 🗓️ Build week map with dates
        const weekMap: Record<string, { date: string; sessions: any[] }> = {}

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

        days.forEach((dayName, index) => {
          const date = new Date(today)
          const diff = index - today.getDay()
          date.setDate(today.getDate() + diff)

          weekMap[dayName] = {
            date: date.toISOString().split('T')[0],
            sessions: [],
          }
        })

        // 🚫 Check full week off
        let isOffWeek = false
        let offReason: string | null = null

        for (const off of rawOffDays) {
          if (off.type === 'range' && off.from && off.to) {
            const from = normalizeDate(new Date(off.from))
            const to = normalizeDate(new Date(off.to))

            if (from <= weekStart && to >= normalizedWeekEnd) {
              isOffWeek = true
              offReason = off.reason
              break
            }
          }

          if (off.type === 'single' && off.date) {
            const offDate = normalizeDate(new Date(off.date))

            if (offDate >= weekStart && offDate <= normalizedWeekEnd) {
              isOffWeek = true
              offReason = off.reason
            }
          }
        }

        // 🚫 Check individual off day
        const isOffDay = (date: Date) => {
          const checkDate = normalizeDate(date)

          return rawOffDays.some((off: any) => {
            if (off.type === 'single' && off.date) {
              return normalizeDate(new Date(off.date)).getTime() === checkDate.getTime()
            }

            if (off.type === 'range' && off.from && off.to) {
              const from = normalizeDate(new Date(off.from))
              const to = normalizeDate(new Date(off.to))

              return checkDate >= from && checkDate <= to
            }

            return false
          })
        }

        // 🔁 Build schedule
        rawSchedules.forEach((item: any) => {
          item.daysOfWeek?.forEach((day: string) => {
            if (weekMap[day]) {
              const targetDate = new Date(weekMap[day].date)

              // ❌ Skip if off day
              if (isOffDay(targetDate)) return

              weekMap[day].sessions.push({
                id: item.id,
                startTime: item.startTime,
                endTime: item.endTime,
                courts: item.courts,
              })
            }
          })
        })

        return Response.json({
          shiftName,
          isOffWeek,
          offReason,
          weekSchedule: weekMap,
        })
      },
    },
  ],
}
