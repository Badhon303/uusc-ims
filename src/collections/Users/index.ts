import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'
import fs from 'fs'
import path from 'path'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: '👤 User',
    plural: '👤 Users',
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: 604800, // 7 days
    verify: false,
    forgotPassword: {
      generateEmailHTML: ({ req, token, user }: any) => {
        const resetPasswordURL = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`

        let html = fs.readFileSync(
          path.join(process.cwd(), 'src/email/forgot-password.html'),
          'utf-8',
        )
        html = html.replace('{{RESET_URL}}', resetPasswordURL)
        return html
      },
    },
  },
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
          label: 'Member',
          value: 'member',
        },
        {
          label: 'Student',
          value: 'student',
        },
        {
          label: 'Guest',
          value: 'guest',
        },
      ],
    },
  ],
  endpoints: [
    {
      path: '/change-password',
      method: 'post',
      handler: async (req) => {
        const { user, payload } = req

        if (!user) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 })
        }

        // Fix for ts(18048) and ts(2722)
        if (!req.json) {
          return Response.json({ message: 'Unsupported request format' }, { status: 400 })
        }

        try {
          const body = await req.json()
          const { currentPassword, newPassword } = body

          if (!currentPassword || !newPassword) {
            return Response.json({ message: 'Missing fields' }, { status: 400 })
          }

          try {
            await payload.login({
              collection: 'users',
              data: { email: user.email, password: currentPassword },
              req,
            })
          } catch (err) {
            return Response.json({ message: 'Current password incorrect' }, { status: 400 })
          }

          await payload.update({
            collection: 'users',
            id: user.id,
            data: { password: newPassword },
          })

          return Response.json({ message: 'Password changed successfully' }, { status: 200 })
        } catch (err) {
          return Response.json({ message: 'Error parsing JSON' }, { status: 400 })
        }
      },
    },
  ],
}
