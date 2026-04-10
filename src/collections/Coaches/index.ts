import { isAdmin } from '@/utils/access/isAdmin'
import type { CollectionConfig } from 'payload'

export const Coaches: CollectionConfig = {
  slug: 'coaches',
  labels: {
    singular: '⛄ Coach',
    plural: '⛄ Coaches',
  },
  admin: {
    useAsTitle: 'coachName',
    group: '🥳 Profiles',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      return ['admin', 'coach'].includes(user.role)
    },
    delete: isAdmin,
  },
  fields: [
    {
      name: 'coachName',
      type: 'text',
      admin: {
        hidden: true, // Don't show it as its own field in the UI
      },
    },
    {
      type: 'row',
      access: {
        update: ({ req }) => {
          return req.user?.role === 'admin'
        },
        create: ({ req }) => {
          return req.user?.role === 'admin'
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
      name: 'specialization',
      type: 'richText',
    },
    {
      name: 'certifications',
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
        },
        {
          name: 'date',
          type: 'date',
        },
        {
          name: 'picture',
          type: 'upload',
          relationTo: 'media',
          hasMany: false,
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
        },
        {
          name: 'date',
          type: 'date',
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
  endpoints: [
    {
      path: '/update-coach-profile-picture',
      method: 'patch',
      handler: async (req: any) => {
        const { user, payload } = req

        if (!user || user.role !== 'coach') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          // 1. Fetch current member to get the old image ID
          const coachQuery = await payload.find({
            collection: 'coaches',
            where: { user: { equals: user.id } },
            limit: 1,
          })

          if (!coachQuery.docs.length) {
            return Response.json({ error: 'Coach profile not found' }, { status: 404 })
          }

          const coachDoc = coachQuery.docs[0]
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
            data: { alt: `Profile picture for ${coachDoc.coachName || user.email}` },
            file: {
              data: buffer,
              mimetype: file.type,
              name: file.name,
              size: file.size,
            },
          })

          const newProfilePictureId = uploadedMedia.id

          // 3. Identify old image ID BEFORE updating
          const oldProfilePicture = coachDoc.profilePicture
          let oldMediaId: string | number | null = null

          if (oldProfilePicture) {
            oldMediaId =
              typeof oldProfilePicture === 'object' ? oldProfilePicture.id : oldProfilePicture
          }

          // 4. Update Coach collection with NEW image ID
          const updatedCoach = await payload.update({
            collection: 'coaches',
            id: coachDoc.id,
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
            id: updatedCoach.id,
            coachName: updatedCoach.coachName,
            profilePicture: updatedCoach.profilePicture,
            updatedAt: updatedCoach.updatedAt,
            createdAt: updatedCoach.createdAt,
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

        if (!user || user.role !== 'coach') {
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
          const coachQuery = await payload.find({
            collection: 'coaches',
            where: { user: { equals: user.id } },
            limit: 1,
          })

          if (!coachQuery.docs.length) {
            return Response.json({ error: 'Coach profile not found' }, { status: 404 })
          }

          const coachDoc = coachQuery.docs[0]

          const achievements: any[] = coachDoc.achievements || []

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

          const updatedCoach = await payload.update({
            collection: 'coaches',
            id: coachDoc.id,
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
          const targetAchievement = updatedCoach.achievements?.find(
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
    {
      path: '/certifications/:certificateId/upload-picture',
      method: 'patch',
      handler: async (req: any) => {
        const { user, payload, routeParams } = req
        const certificateId = routeParams?.certificateId

        if (!user || user.role !== 'coach') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!certificateId) {
          return Response.json({ error: 'Certificate ID is required' }, { status: 400 })
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
          const file = formData.get('certificatePicture') as File | null

          if (!file || file.size === 0) {
            return Response.json({ error: 'No file provided' }, { status: 400 })
          }

          // 1. Fetch the member and find the specific achievement
          const coachQuery = await payload.find({
            collection: 'coaches',
            where: { user: { equals: user.id } },
            limit: 1,
          })

          if (!coachQuery.docs.length) {
            return Response.json({ error: 'Coach profile not found' }, { status: 404 })
          }

          const coachDoc = coachQuery.docs[0]

          const certificates: any[] = coachDoc.certifications || []

          const certificateIndex = certificates.findIndex((a: any) => a.id === certificateId)

          if (certificateIndex === -1) {
            return Response.json({ error: 'Certificate not found' }, { status: 404 })
          }

          // 2. Upload new media
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const uploadedMedia = await payload.create({
            collection: 'media',
            data: { alt: `Certificate picture for ${certificates[certificateIndex].title}` },
            file: {
              data: buffer,
              mimetype: file.type,
              name: file.name,
              size: file.size,
            },
          })

          const newPictureId = uploadedMedia.id

          // 3. Identify old image ID BEFORE updating
          const oldPicture = certificates[certificateIndex].picture
          let oldMediaId: string | number | null = null

          if (oldPicture) {
            oldMediaId = typeof oldPicture === 'object' ? oldPicture.id : oldPicture
          }

          // 4. Patch only the target certificate's picture in the array
          const updatedCertificates = certificates.map((a: any, i: number) =>
            i === certificateIndex ? { ...a, picture: newPictureId } : a,
          )

          const updatedCoach = await payload.update({
            collection: 'coaches',
            id: coachDoc.id,
            data: { certifications: updatedCertificates },
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
              payload.logger.info(`Deleted old certificate media: ${oldMediaId}`)
            } catch (err) {
              payload.logger.warn(`Cleanup failed for certificate media ${oldMediaId} ${err}`)
            }
          }

          // Find the specific certificate we just updated to get its populated picture
          const targetCertificate = updatedCoach.certifications?.find(
            (a: any) => a.id === certificateId,
          )

          return Response.json({
            message: 'Certificate picture updated successfully',
            doc: targetCertificate?.picture || null,
          })
        } catch (error: any) {
          // Additional debugging for Content-Type issues
          if (error.message && error.message.includes('Content-Type')) {
            console.error('Content-Type issue detected!')
            console.error('Request Content-Type header:', req.headers?.['content-type'])
            console.error('Request headers:', req.headers)
            console.error('Make sure the client is sending multipart/form-data')
          }

          payload.logger.error({ err: error }, 'Certificate Picture Upload Error')
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
