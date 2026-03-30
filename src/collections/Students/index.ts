import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'
import { getMemberPackage } from '../Members'

export const getStudentPackage = async (req: any) => {
  // ✅ If already fetched, reuse
  if (req.studentPackage) return req.studentPackage

  const result = await req.payload.find({
    collection: 'packages',
    where: {
      title: {
        equals: 'Academy Students',
      },
    },
    limit: 1,
  })

  req.studentPackage = result.docs?.[0] || null

  return req.studentPackage
}

export const Students: CollectionConfig = {
  slug: 'students',
  labels: {
    singular: '🐸 Student',
    plural: '🐸 Students',
  },
  admin: {
    useAsTitle: 'studentName',
    group: '🥳 Profiles',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'manager'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'manager') return true
      return {
        'user.id': { equals: user.id },
      }
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'studentName',
      type: 'text',
      admin: {
        hidden: true, // Don't show it as its own field in the UI
      },
    },
    {
      type: 'row',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'manager'
        },
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          unique: true,
          hasMany: false,
          defaultValue: ({ user }) => {
            return user?.id
          },
        },
        {
          name: 'joinDate',
          type: 'date',
          defaultValue: new Date().toISOString(),
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            {
              label: 'Active',
              value: 'active',
            },
            {
              label: 'Pending',
              value: 'pending',
            },
            {
              label: 'Inactive',
              value: 'inactive',
            },
          ],
          defaultValue: 'inactive',
          required: true,
        },
      ],
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'parentName',
          type: 'text',
        },
        {
          name: 'parentContactNumber',
          type: 'text',
        },
      ],
    },
    {
      type: 'row',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'coach'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin' || req.user?.role === 'coach'
        },
      },
      fields: [
        {
          name: 'skillLevel',
          type: 'select',
          options: [
            {
              label: 'Beginner',
              value: 'beginner',
            },
            {
              label: 'Intermediate',
              value: 'intermediate',
            },
            {
              label: 'Advanced',
              value: 'advanced',
            },
          ],
          defaultValue: 'beginner',
        },
        {
          name: 'ranking',
          type: 'number',
          unique: true,
        },
      ],
    },
    {
      name: 'achievements',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: true,
        },
        {
          name: 'date',
          type: 'date',
          required: true,
        },
        {
          name: 'picture',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
  hooks: {
    beforeRead: [
      async ({ doc, req }) => {
        if (doc?.user) {
          // If already populated (depth >= 1), use it directly — no extra query
          if (typeof doc.user === 'object') {
            doc.studentName = doc.user.name ?? null
          } else {
            // Fallback for depth: 0 — manually fetch
            try {
              const userDoc = await req.payload.findByID({
                collection: 'users',
                id: doc.user,
                depth: 0,
              })
              doc.studentName = userDoc?.name ?? null
            } catch {
              doc.studentName = null
            }
          }
        }
        return doc
      },
    ],
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
}
