import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: '👤 User',
    plural: '👤 Users',
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: { equals: user.id },
      }
    },
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: { equals: user.id },
      }
    },
    delete: isAdmin,
    admin: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'staff', 'coach'].includes(user.role)
    },
  },
  fields: [
    // Email added by default
    // Add more fields as needed
    {
      name: 'name',
      type: 'text',
      label: 'Name',
      unique: true,
      required: true,
      maxLength: 99,
    },
    {
      name: 'contactNumber',
      label: 'Contact Number',
      type: 'text',
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
      name: 'address',
      type: 'text',
      label: 'Address',
      maxLength: 999,
    },
    {
      name: 'role',
      type: 'select',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
        },
      },
      required: true,
      saveToJWT: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Staff',
          value: 'staff',
        },
        {
          label: 'Coach',
          value: 'coach',
        },
        {
          label: 'Members',
          value: 'members',
        },
        {
          label: 'Students',
          value: 'students',
        },
        {
          label: 'Guest',
          value: 'guest',
        },
      ],
    },
  ],
}
