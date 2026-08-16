import { isAuthenticated } from '@/utils/access/isAuthenticated'
import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const StudentAttendance: CollectionConfig = {
  slug: 'student-attendance',
  labels: {
    singular: '🪃 Student Attendance',
    plural: '🪃 Student Attendances',
  },
  admin: {
    useAsTitle: 'student',
    group: '⛹️ Training',
  },
  access: {
    read: isAuthenticated,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      unique: true,
      hasMany: false,
    },
    {
      name: 'attendances',
      type: 'array',
      validate: (val: any) => {
        if (!val || !Array.isArray(val)) return true

        const seen = new Set()
        for (const p of val) {
          if (!p.attendanceMonth) continue
          const date = new Date(p.attendanceMonth)
          // Key format: "2024-5" (Year-MonthIndex)
          const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`

          if (seen.has(key)) {
            return `Duplicate attendance detected for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
          }
          seen.add(key)
        }
        return true
      },
      fields: [
        {
          name: 'attendanceMonth',
          type: 'date',
          admin: {
            date: {
              displayFormat: 'MMMM yyyy',
              pickerAppearance: 'monthOnly',
            },
          },
          defaultValue: () => new Date(),
        },
        {
          name: 'absentDates',
          type: 'array',
          fields: [
            {
              type: 'row',
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
              ],
            },
            {
              name: 'reason',
              type: 'textarea',
            },
          ],
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/student-attendance-report/:studentId/generate',
      method: 'get',
      handler: async (req: any) => {
        const { studentId } = req.routeParams
        const { month, year } = req.query

        if (!studentId || !month || !year) {
          return Response.json(
            { message: 'Student ID, month, and year are required' },
            { status: 400 },
          )
        }

        const targetMonth = parseInt(month as string) // 1-12
        const targetYear = parseInt(year as string)

        // 1. Fetch record and populate student details
        const record = await req.payload.findByID({
          collection: 'student-attendance',
          id: studentId,
          depth: 2, // Ensure student and user details are fetched
          req,
          overrideAccess: false,
        })

        if (!record) {
          return Response.json({ message: 'Record not found' }, { status: 404 })
        }

        const monthlyRecord = record.attendances?.find((entry: any) => {
          const d = new Date(entry.attendanceMonth)
          return d.getUTCMonth() + 1 === targetMonth && d.getUTCFullYear() === targetYear
        })

        if (!monthlyRecord) {
          return Response.json({ message: 'No attendance data for this period' }, { status: 404 })
        }

        // 2. Setup Date Logic
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
        const attendanceSheet = []
        let totalAbsent = 0

        // 3. Iterate through every day of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const currentFullDate = new Date(Date.UTC(targetYear, targetMonth - 1, day))
          const dateString = currentFullDate.toISOString().split('T')[0]

          // Check if this date falls under any absence entry
          const absenceEntry = monthlyRecord.absentDates.find((abs: any) => {
            if (abs.type === 'single') {
              return new Date(abs.date).toISOString().split('T')[0] === dateString
            } else if (abs.type === 'range') {
              const start = new Date(abs.from).toISOString().split('T')[0]
              const end = new Date(abs.to).toISOString().split('T')[0]
              return dateString >= start && dateString <= end
            }
            return false
          })

          if (absenceEntry) {
            totalAbsent++
            attendanceSheet.push({
              date: dateString,
              status: 'Absent',
              reason: absenceEntry.reason || 'No reason provided',
            })
          } else {
            attendanceSheet.push({
              date: dateString,
              status: 'Present',
              reason: null,
            })
          }
        }

        // 4. Final structured response
        return Response.json({
          studentInfo: {
            id: record.student.id,
            name: record.student.studentName,
            email: record.student.user?.email,
            contactNumber: record.student.user?.contactNumber || record.student.parentContactNumber,
          },
          statistics: {
            totalDaysInMonth: daysInMonth,
            totalPresent: daysInMonth - totalAbsent,
            totalAbsent: totalAbsent,
            attendancePercentage: `${(((daysInMonth - totalAbsent) / daysInMonth) * 100).toFixed(2)}%`,
          },
          dailyLogs: attendanceSheet,
        })
      },
    },
  ],
}
