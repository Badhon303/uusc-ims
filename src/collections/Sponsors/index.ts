import { isAdmin } from '@/utils/access/isAdmin'
import { sql } from 'drizzle-orm'
import type { CollectionConfig } from 'payload'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: {
    singular: '🥳 Sponsors',
    plural: '🥳 Sponsors',
  },
  admin: {
    useAsTitle: 'name',
    group: '💳 Payments & Packages',
    components: {
      beforeList: ['@/components/SponsorReports'],
    },
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'managers'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'picture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'contactNumber',
      label: 'Contact Number',
      type: 'text',
      required: true,
      validate: (val: any) => {
        if (!val) return true
        // If it's not a string (null/undefined), let 'required: true' handle it
        if (typeof val !== 'string') return true
        const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/
        if (!bdPhoneRegex.test(val)) {
          return 'Please enter a valid Bangladesh contact number (e.g., 01712345678 or +8801712345678)'
        }
        return true
      },
      admin: {
        placeholder: '017XXXXXXXX',
      },
    },
    {
      name: 'amounts',
      type: 'array',
      fields: [
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
      ],
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
  endpoints: [
    {
      path: '/income-from-sponsors',
      method: 'get',
      handler: async (req: any) => {
        // 1. Access Control
        if (!req.user || !['admin', 'managers'].includes(req.user.role)) {
          return Response.json({ error: 'forbidden' }, { status: 403 })
        }
        try {
          const { month, year } = req.query

          let start: Date | null = null
          let end: Date | null = null

          // ✅ Build date range if provided
          if (month && year) {
            start = new Date(Number(year), Number(month) - 1, 1)
            end = new Date(Number(year), Number(month), 0, 23, 59, 59)
          }

          // ✅ Execute query
          const result = await req.payload.db.drizzle.execute(sql`
              SELECT
                COALESCE(SUM(sa.amount), 0) as "totalSponsoredAmount",
                COUNT(DISTINCT s.id) as "totalSponsors"

              FROM sponsors s
              LEFT JOIN sponsors_amounts sa
                ON sa._parent_id = s.id

              WHERE 1=1
              ${start && end ? sql`AND sa.date >= ${start} AND sa.date <= ${end}` : sql``}
            `)

          const data = result.rows?.[0] || {}

          return Response.json({
            totalSponsoredAmount: Number(data.totalSponsoredAmount || 0),
            totalSponsors: Number(data.totalSponsors || 0),
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch sponsor income stats' }, { status: 500 })
        }
      },
    },
  ],
}
