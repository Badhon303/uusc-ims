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
  endpoints: [
    {
      path: '/update-member-profile-picture',
      method: 'patch',
      handler: async (req: any) => {
        const { user, payload } = req

        if (!user || user.role !== 'member') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          // 1. Fetch current member to get the old image ID
          const memberQuery = await payload.find({
            collection: 'members',
            where: { user: { equals: user.id } },
            limit: 1,
          })

          if (!memberQuery.docs.length) {
            return Response.json({ error: 'Member profile not found' }, { status: 404 })
          }

          const memberDoc = memberQuery.docs[0]
          const formData = await req.formData()
          const file = formData.get('profilePicture') as File | null

          if (!file || file.size === 0) {
            return Response.json({ error: 'No file provided' }, { status: 400 })
          }

          // 2. Upload new media
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const uploadedMedia = await payload.create({
            collection: 'media',
            data: { alt: `Profile picture for ${memberDoc.memberName || user.email}` },
            file: {
              data: buffer,
              mimetype: file.type,
              name: file.name,
              size: file.size,
            },
          })

          const newProfilePictureId = uploadedMedia.id

          // 3. Identify old image ID BEFORE updating
          const oldProfilePicture = memberDoc.profilePicture
          let oldMediaId: string | number | null = null

          if (oldProfilePicture) {
            oldMediaId =
              typeof oldProfilePicture === 'object' ? oldProfilePicture.id : oldProfilePicture
          }

          // 4. Update Member collection with NEW image ID
          const updatedMember = await payload.update({
            collection: 'members',
            id: memberDoc.id,
            data: { profilePicture: newProfilePictureId },
            overrideAccess: true, // Prevents validation errors
          })

          // 5. Cleanup: Delete the OLD image if it exists and is different
          if (oldMediaId && oldMediaId !== newProfilePictureId) {
            try {
              await payload.delete({
                collection: 'media',
                id: oldMediaId,
                overrideAccess: true,
              })
              payload.logger.info(`Deleted old media: ${oldMediaId}`)
            } catch (err) {
              payload.logger.warn(`Cleanup failed for media ${oldMediaId}`)
            }
          }

          const filteredDoc = {
            id: updatedMember.id,
            memberName: updatedMember.memberName,
            profilePicture: updatedMember.profilePicture,
            updatedAt: updatedMember.updatedAt,
            createdAt: updatedMember.createdAt,
          }

          return Response.json({
            message: 'Profile picture updated successfully',
            doc: filteredDoc,
          })
        } catch (error: any) {
          payload.logger.error({ err: error }, 'Profile Update Error')
          return Response.json({ error: error.message || 'Internal server error' }, { status: 500 })
        }
      },
    },
    {
      path: '/achievements/:achievementId/upload-picture',
      method: 'patch',
      handler: async (req: any) => {
        const { user, payload, routeParams } = req
        const achievementId = routeParams?.achievementId

        if (!user || user.role !== 'member') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!achievementId) {
          return Response.json({ error: 'Achievement ID is required' }, { status: 400 })
        }

        try {
          // Check if req.formData is available
          if (typeof req.formData !== 'function') {
            console.error(Object.keys(req))
            return Response.json(
              {
                error:
                  'Form data parsing not available. Please ensure multipart/form-data is sent.',
              },
              { status: 400 },
            )
          }
          const formData = await req.formData()
          const file = formData.get('achievementPicture') as File | null

          if (!file || file.size === 0) {
            return Response.json({ error: 'No file provided' }, { status: 400 })
          }

          // 1. Fetch the member and find the specific achievement
          const memberQuery = await payload.find({
            collection: 'members',
            where: { user: { equals: user.id } },
            limit: 1,
          })

          if (!memberQuery.docs.length) {
            return Response.json({ error: 'Member profile not found' }, { status: 404 })
          }

          const memberDoc = memberQuery.docs[0]

          const achievements: any[] = memberDoc.achievements || []

          const achievementIndex = achievements.findIndex((a: any) => a.id === achievementId)

          if (achievementIndex === -1) {
            return Response.json({ error: 'Achievement not found' }, { status: 404 })
          }

          // 2. Upload new media
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const uploadedMedia = await payload.create({
            collection: 'media',
            data: { alt: `Achievement picture for ${achievements[achievementIndex].title}` },
            file: {
              data: buffer,
              mimetype: file.type,
              name: file.name,
              size: file.size,
            },
          })

          const newPictureId = uploadedMedia.id

          // 3. Identify old image ID BEFORE updating
          const oldPicture = achievements[achievementIndex].picture
          let oldMediaId: string | number | null = null

          if (oldPicture) {
            oldMediaId = typeof oldPicture === 'object' ? oldPicture.id : oldPicture
          }

          // 4. Patch only the target achievement's picture in the array
          const updatedAchievements = achievements.map((a: any, i: number) =>
            i === achievementIndex ? { ...a, picture: newPictureId } : a,
          )

          const updatedMember = await payload.update({
            collection: 'members',
            id: memberDoc.id,
            data: { achievements: updatedAchievements },
            overrideAccess: true,
          })

          // 5. Cleanup: Delete the OLD image if it exists and is different
          if (oldMediaId && oldMediaId !== newPictureId) {
            try {
              await payload.delete({
                collection: 'media',
                id: oldMediaId,
                overrideAccess: true,
              })
              payload.logger.info(`Deleted old achievement media: ${oldMediaId}`)
            } catch (err) {
              payload.logger.warn(`Cleanup failed for achievement media ${oldMediaId} ${err}`)
            }
          }

          // Find the specific achievement we just updated to get its populated picture
          const targetAchievement = updatedMember.achievements?.find(
            (a: any) => a.id === achievementId,
          )

          return Response.json({
            message: 'Achievement picture updated successfully',
            doc: targetAchievement?.picture || null,
          })
        } catch (error: any) {
          // Additional debugging for Content-Type issues
          if (error.message && error.message.includes('Content-Type')) {
            console.error('Content-Type issue detected!')
            console.error('Request Content-Type header:', req.headers?.['content-type'])
            console.error('Request headers:', req.headers)
            console.error('Make sure the client is sending multipart/form-data')
          }

          payload.logger.error({ err: error }, 'Achievement Picture Upload Error')
          return Response.json(
            {
              error: error.message || 'Internal server error',
              details: error.type || 'Unknown error',
            },
            { status: 500 },
          )
        }
      },
    },
  ],
}
