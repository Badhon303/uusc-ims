import { isAuthenticated } from '@/utils/access/isAuthenticated'
import { sql } from 'drizzle-orm'
import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'
import { resolveReportTenantScope } from '@/utils/access/tenantReport'

export const getMemberPackage = async (req: any) => {
  // ✅ If already fetched, reuse
  if (req.memberPackage) return req.memberPackage

  const result = await req.payload.find({
    collection: 'packages',
    where: {
      title: {
        equals: 'Club Members',
      },
    },
    limit: 1,
  })

  req.memberPackage = result.docs?.[0] || null

  return req.memberPackage
}

export const MemberPayments: CollectionConfig = {
  slug: 'member-payments',
  labels: {
    singular: '💲Member Payment',
    plural: '💲Member Payments',
  },
  admin: {
    useAsTitle: 'user',
    group: '💳 Payments & Packages',
    components: {
      beforeList: ['@/components/MemberReports'], // This places the cards above the list
    },
  },
  access: {
    read: isAuthenticated,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'members',
          required: true,
          unique: true,
          hasMany: false,
        },
        {
          name: 'totalDue',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'totalPaid',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'registrationFee',
          type: 'number',
          defaultValue: async ({ req }) => {
            const pkg = await getMemberPackage(req)
            return pkg?.registrationFee || 0
          },
          required: true,
        },
        {
          name: 'registrationDate',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
        },
      ],
    },
    {
      name: 'payments',
      type: 'array',
      validate: (val: any) => {
        if (!val || !Array.isArray(val)) return true

        const seen = new Set()
        for (const p of val) {
          if (!p.paymentMonth) continue
          const date = new Date(p.paymentMonth)
          // Key format: "2024-5" (Year-MonthIndex)
          const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`

          if (seen.has(key)) {
            return `Duplicate payment detected for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
          }
          seen.add(key)
        }
        return true
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'paymentMonth',
              type: 'date',
              unique: true,
              admin: {
                date: {
                  displayFormat: 'MMMM yyyy',
                  pickerAppearance: 'monthOnly',
                },
              },
              defaultValue: () => new Date(),
            },
            {
              name: 'amount',
              type: 'number',
              required: true,
              admin: {
                readOnly: true,
              },
              defaultValue: async ({ req }) => {
                const pkg = await getMemberPackage(req)
                return pkg?.price || 0
              },
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              options: [
                { label: 'Paid', value: 'paid' },
                { label: 'Unpaid', value: 'unpaid' },
              ],
              defaultValue: 'unpaid',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'paymentMethod',
              type: 'select',
              required: true,
              options: [
                { label: 'Cash', value: 'cash' },
                { label: 'Mobile Banking', value: 'mobile-banking' },
                { label: 'Card', value: 'card' },
              ],
              defaultValue: 'cash',
            },
            {
              name: 'transactionRef',
              type: 'text',
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.payments && Array.isArray(data.payments)) {
          data.totalPaid = data.payments
            .filter((p: any) => p.status === 'paid')
            .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

          data.totalDue = data.payments
            .filter((p: any) => p.status === 'unpaid')
            .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

          data.payments.sort(
            (a: any, b: any) =>
              new Date(b.paymentMonth).getTime() - new Date(a.paymentMonth).getTime(),
          )
        }
        return data
      },
    ],
  },
  endpoints: [
    {
      path: '/income-from-members',
      method: 'get',
      handler: async (req: any) => {
        // 1. Access Control
        if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
          return Response.json({ error: 'forbidden' }, { status: 403 })
        }
        try {
          const { month, year } = req.query
          let start: Date | null = null
          let end: Date | null = null

          if (month && year) {
            start = new Date(Number(year), Number(month) - 1, 1)
            end = new Date(Number(year), Number(month), 0, 23, 59, 59)
          }

          const { tenantId, isSuperAdmin } = resolveReportTenantScope(req)

          if (!isSuperAdmin && !tenantId) {
            return Response.json({ error: 'forbidden' }, { status: 403 })
          }

          const result = await req.payload.db.drizzle.execute(sql`
                    SELECT 
                      -- 1. Sum Registration Fees (Using a subquery to avoid duplicates from joins)
                      (
                        SELECT COALESCE(SUM(registration_fee), 0)
                        FROM member_payments
                        WHERE 1=1
                        ${tenantId ? sql`AND tenant_id = ${tenantId}` : sql``}
                        ${start ? sql`AND registration_date >= ${start} AND registration_date <= ${end}` : sql``}
              ) as "memberRegistrationFee",

              -- 2. Sum Subscription Fees (Paid)
              COALESCE(SUM(
                CASE 
                  WHEN p.status = 'paid' 
                  AND ${start ? sql`p.payment_month >= ${start} AND p.payment_month <= ${end}` : sql`TRUE`}
                  THEN p.amount ELSE 0 
                END
              ), 0) as "memberSubscriptionFee",

              -- 3. Sum Total Due (Unpaid Subscriptions)
              COALESCE(SUM(
                CASE 
                  WHEN p.status = 'unpaid' 
                  AND ${start ? sql`p.payment_month >= ${start} AND p.payment_month <= ${end}` : sql`TRUE`}
                  THEN p.amount ELSE 0 
                END
              ), 0) as "totalSubscriptionDue"

            FROM member_payments_payments p
            INNER JOIN member_payments mp ON mp.id = p._parent_id
            WHERE 1=1
            ${tenantId ? sql`AND mp.tenant_id = ${tenantId}` : sql``}
          `)

          const data = result.rows?.[0] || {}

          const memberRegistrationFee = Number(data.memberRegistrationFee || 0)
          const memberSubscriptionFee = Number(data.memberSubscriptionFee || 0)
          const totalSubscriptionDue = Number(data.totalSubscriptionDue || 0)

          return Response.json({
            memberRegistrationFee,
            memberSubscriptionFee,
            totalIncome: memberRegistrationFee + memberSubscriptionFee,
            totalSubscriptionDue, // Added this field
          })
        } catch (err) {
          req.payload.logger.error(err)
          return Response.json({ error: 'Failed to fetch income stats' }, { status: 500 })
        }
      },
    },
  ],
}
