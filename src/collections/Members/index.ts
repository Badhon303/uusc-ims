import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

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

export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    singular: '🦖 Member',
    plural: '🦖 Members',
  },
  admin: {
    useAsTitle: 'memberName',
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
      name: 'memberName',
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
          filterOptions: () => {
            return {
              role: {
                equals: 'member',
              },
            }
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
      hasMany: false,
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
          hasMany: false,
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Handle memberName on create/update
        if (data?.user && (operation === 'create' || operation === 'update')) {
          let userName = null

          if (typeof data.user === 'object') {
            userName = data.user.name ?? null
          } else if (typeof data.user === 'number' || typeof data.user === 'string') {
            try {
              const userDoc = await req.payload.findByID({
                collection: 'users',
                id: data.user,
                depth: 0,
              })
              userName = userDoc?.name ?? null
            } catch {
              userName = null
            }
          }

          data.memberName = userName
        }

        // Your existing payment calculations
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
    afterChange: [
      async ({ doc, req, operation }) => {
        // Ensure memberName is updated after change, especially if the user relationship
        // was modified and we need to re-fetch the user name
        if (doc?.user && (operation === 'create' || operation === 'update')) {
          let userName = null

          if (typeof doc.user === 'object') {
            userName = doc.user.name ?? null
          } else {
            try {
              const userDoc = await req.payload.findByID({
                collection: 'users',
                id: doc.user,
                depth: 0,
              })
              userName = userDoc?.name ?? null
            } catch {
              userName = null
            }
          }

          // Only update if the name has changed or is null
          if (doc.memberName !== userName) {
            await req.payload.update({
              collection: 'members',
              id: doc.id,
              data: {
                memberName: userName,
              },
              req,
            })
          }
        }
        return doc
      },
    ],
  },
  // endpoints: [
  //   {
  //     path: '/:id/update-with-image',
  //     method: 'patch',
  //     handler: async (req) => {
  //       const { payload, routeParams, file } = req
  //       const id = routeParams?.id

  //       // 1. Validate the ID type
  //       if (!id || typeof id !== 'string') {
  //         return Response.json({ error: 'Invalid or missing ID' }, { status: 400 })
  //       }

  //       try {
  //         // 1. Get the current member to find the old image ID
  //         const oldMember = await payload.findByID({
  //           collection: 'members',
  //           id,
  //         })

  //         let newImageId = oldMember.profilePicture

  //         // 2. If a new file is attached, upload it
  //         if (file) {
  //           const newMedia = await payload.create({
  //             collection: 'media',
  //             data: {}, // Any additional media fields
  //             file: file,
  //           })
  //           newImageId = newMedia.id
  //         }

  //         // 3. Update the Member with the new image and other data
  //         // req.json() contains the other text fields sent in the request
  //         const body = await req.json?.().catch(() => ({}))

  //         const updatedMember = await payload.update({
  //           collection: 'members',
  //           id,
  //           data: {
  //             ...body,
  //             profilePicture: newImageId,
  //           },
  //         })

  //         // 4. Cleanup: Delete the old image if it was replaced
  //         if (file && oldMember.profilePicture) {
  //           const oldId =
  //             typeof oldMember.profilePicture === 'object'
  //               ? oldMember.profilePicture.id
  //               : oldMember.profilePicture

  //           await payload.delete({
  //             collection: 'media',
  //             id: oldId,
  //           })
  //         }

  //         return Response.json(updatedMember)
  //       } catch (err: any) {
  //         return Response.json({ error: err.message }, { status: 500 })
  //       }
  //     },
  //   },
  // ],
}
