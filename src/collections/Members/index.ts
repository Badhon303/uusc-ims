import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    singular: '🦖 Member',
    plural: '🦖 Members',
  },
  admin: {
    useAsTitle: 'user',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'member'].includes(user.role)
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        'user.id': { equals: user.id },
      }
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      hasMany: false,
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      defaultValue: ({ user }) => {
        return user?.id
      },
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      type: 'select',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      options: [
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Inactive',
          value: 'inactive',
        },
      ],
      defaultValue: 'inactive',
      required: true,
    },
    {
      name: 'joinDate',
      type: 'date',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      defaultValue: new Date().toISOString(),
      required: true,
    },
    {
      name: 'totalDue',
      type: 'number',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      defaultValue: 0,
      required: true,
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
    {
      name: 'package',
      type: 'relationship',
      relationTo: 'packages',
      required: true,
      hasMany: false,
      admin: {
        readOnly: true,
      },
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      defaultValue: async ({ req }) => {
        // 1. Access the payload instance from the request
        const { payload } = req

        // 2. Find the package where the title matches "Club Members"
        const packageDocs = await payload.find({
          collection: 'packages',
          where: {
            title: {
              equals: 'Club Members',
            },
          },
          limit: 1,
        })

        // 3. Return the ID of the first match, or null if not found
        return packageDocs.docs.length > 0 ? packageDocs.docs[0].id : null
      },
    },
  ],
}
