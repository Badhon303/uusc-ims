import { isAdmin } from '@/utils/access/isAdmin'
import { isSuperAdminField } from '@/utils/access/isSuperAdmin'
import { getTenantIdFromUser, isSuperAdminUser } from '@/utils/access/currentUser'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import fs from 'fs'
import path from 'path'

const adminOnly = ({ req }: any) => {
  return req.user?.isSuperAdmin === true || req.user?.role === 'admin'
}

export const Users: CollectionConfig = {
  slug: 'users',
  defaultPopulate: {
    sessions: false,
  },
  labels: {
    singular: '🐻‍❄️ User',
    plural: '🐻‍❄️ Users',
  },
  admin: {
    useAsTitle: 'name',
    group: '⚙️ Settings',
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
    // Tenant scoping is layered on top of this by @payloadcms/plugin-multi-tenant
    read: ({ req: { user } }) => Boolean(user),
    create: isAdmin,
    update: ({ req: { user } }) => {
      const currentUser = user as any

      if (!user) return false
      if (currentUser?.isSuperAdmin === true || currentUser?.role === 'admin') return true
      return {
        id: { equals: user.id },
      }
    },
    delete: isAdmin,
    admin: ({ req: { user } }) => {
      const currentUser = user as any

      if (!user) return false
      if (currentUser?.isSuperAdmin === true) return true
      return ['admin', 'manager', 'coach', 'staff'].includes(currentUser?.role)
    },
  },
  fields: [
    // Email added by default
    {
      type: 'row',
      fields: [
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
          name: 'role',
          type: 'select',
          access: {
            update: adminOnly,
            create: adminOnly,
          },
          required: true,
          saveToJWT: true,
          options: [
            {
              label: 'Super Admin',
              value: 'super-admin',
            },
            {
              label: 'Admin',
              value: 'admin',
            },
            {
              label: 'Manager',
              value: 'manager',
            },
            {
              label: 'Coach',
              value: 'coach',
            },
            {
              label: 'Staff',
              value: 'staff',
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
    },
    {
      name: 'isSuperAdmin',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      access: {
        update: isSuperAdminField,
        create: isSuperAdminField,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          (user as { isSuperAdmin?: boolean } | null)?.isSuperAdmin === true,
      },
    },
    {
      name: 'tenantSubscriptionStatus',
      type: 'text',
      saveToJWT: true,
      // Gates the suspended-tenant mutation guard, so it must never be client-writable
      access: {
        update: isSuperAdminField,
        create: isSuperAdminField,
      },
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
    {
      name: 'address',
      type: 'text',
      label: 'Address',
      maxLength: 999,
    },
  ],
  hooks: {
    beforeChange: [
      // Privilege escalation guard: only super admins may mint super admins or
      // move users between tenants. Tenant admins are pinned to their own tenant.
      ({ data, req, operation, originalDoc }) => {
        if (isSuperAdminUser(req) || !req.user) {
          return data
        }

        if (data.isSuperAdmin === true || data.role === 'super-admin') {
          throw new APIError('Only a super admin can grant super admin access.', 403)
        }

        data.isSuperAdmin = originalDoc?.isSuperAdmin === true

        // Tenant membership is never self-served: on create the new user inherits the
        // actor's tenant, on update the existing assignment is left untouched.
        if (operation === 'create') {
          const actorTenantId = getTenantIdFromUser(req)

          if (!actorTenantId) {
            throw new APIError('You are not assigned to a tenant.', 403)
          }

          data.tenants = [{ tenant: actorTenantId }]
        } else {
          delete data.tenants
        }

        return data
      },
      async ({ data, req }) => {
        if (data.isSuperAdmin === true) {
          data.role = 'super-admin'
          data.tenants = []
          data.tenantSubscriptionStatus = 'active'
          return data
        }

        const tenantEntries = Array.isArray(data.tenants) ? data.tenants : []
        const tenantValue = tenantEntries[0]?.tenant

        if (!tenantValue) {
          return data
        }

        const tenantId =
          typeof tenantValue === 'object' && tenantValue !== null ? tenantValue.id : tenantValue

        if (!tenantId) {
          return data
        }

        try {
          const tenantDoc = (await req.payload.findByID({
            collection: 'tenants' as never,
            id: tenantId,
            depth: 0,
          })) as any

          data.tenantSubscriptionStatus = tenantDoc.subscriptionStatus || 'active'
        } catch {
          data.tenantSubscriptionStatus = data.tenantSubscriptionStatus || 'active'
        }

        return data
      },
    ],
    afterRead: [
      ({ doc }) => {
        delete doc.collection
        return doc
      },
    ],
  },
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
            req,
          })

          return Response.json({ message: 'Password changed successfully' }, { status: 200 })
        } catch (err) {
          return Response.json({ message: 'Error parsing JSON' }, { status: 400 })
        }
      },
    },
  ],
}
