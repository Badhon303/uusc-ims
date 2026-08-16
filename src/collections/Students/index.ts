import { isAuthenticated } from '@/utils/access/isAuthenticated'
import { isAdmin } from '@/utils/access/isAdmin'
import { tenantScopedUserFilter } from '@/utils/access/tenantFilterOptions'
import type { CollectionConfig } from 'payload'

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
    read: isAuthenticated,
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
          filterOptions: ({ req }) => tenantScopedUserFilter(req, 'student'),
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
  hooks: {
    afterRead: [
      ({ doc }) => {
        // Populate the virtual `studentName` from the populated user relationship.
        // The admin UI uses depth >= 1 for list views, so `doc.user` is normally
        // populated. We intentionally do NOT fall back to a per-document fetch
        // when depth is 0 — that created an N+1 in list views. Callers that use
        // depth 0 and need the name should populate the relationship themselves.
        if (doc?.user && typeof doc.user === 'object') {
          doc.studentName = doc.user.name ?? null
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
  endpoints: [
    {
      path: '/update-student-profile-picture',
      method: 'patch',
      handler: async (req: any) => {
        const { user, payload } = req

        if (!user || user.role !== 'student') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          // 1. Fetch current member to get the old image ID
          const studentQuery = await payload.find({
            collection: 'students',
            where: { user: { equals: user.id } },
            limit: 1,
            req,
            overrideAccess: false,
          })

          if (!studentQuery.docs.length) {
            return Response.json({ error: 'Student profile not found' }, { status: 404 })
          }

          const studentDoc = studentQuery.docs[0]
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
            data: { alt: `Profile picture for ${studentDoc.studentName || user.email}` },
            file: {
              data: buffer,
              mimetype: file.type,
              name: file.name,
              size: file.size,
            },
            req,
          })

          const newProfilePictureId = uploadedMedia.id

          // 3. Identify old image ID BEFORE updating
          const oldProfilePicture = studentDoc.profilePicture
          let oldMediaId: string | number | null = null

          if (oldProfilePicture) {
            oldMediaId =
              typeof oldProfilePicture === 'object' ? oldProfilePicture.id : oldProfilePicture
          }

          // 4. Update Member collection with NEW image ID
          const updatedStudent = await payload.update({
            collection: 'students',
            id: studentDoc.id,
            data: { profilePicture: newProfilePictureId },
            overrideAccess: true, // Student is editing their own profile picture
            req,
          })

          // 5. Cleanup: Delete the OLD image if it exists and is different
          if (oldMediaId && oldMediaId !== newProfilePictureId) {
            try {
              await payload.delete({
                collection: 'media',
                id: oldMediaId,
                overrideAccess: true,
                req,
              })
              payload.logger.info(`Deleted old media: ${oldMediaId}`)
            } catch (err) {
              payload.logger.warn(`Cleanup failed for media ${oldMediaId}`)
            }
          }

          const filteredDoc = {
            id: updatedStudent.id,
            studentName: updatedStudent.studentName,
            profilePicture: updatedStudent.profilePicture,
            updatedAt: updatedStudent.updatedAt,
            createdAt: updatedStudent.createdAt,
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

        if (!user || user.role !== 'student') {
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
          const studentQuery = await payload.find({
            collection: 'students',
            where: { user: { equals: user.id } },
            limit: 1,
            req,
            overrideAccess: false,
          })

          if (!studentQuery.docs.length) {
            return Response.json({ error: 'Student profile not found' }, { status: 404 })
          }

          const studentDoc = studentQuery.docs[0]

          const achievements: any[] = studentDoc.achievements || []

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
            req,
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

          const updatedStudent = await payload.update({
            collection: 'students',
            id: studentDoc.id,
            data: { achievements: updatedAchievements },
            overrideAccess: true,
            req,
          })

          // 5. Cleanup: Delete the OLD image if it exists and is different
          if (oldMediaId && oldMediaId !== newPictureId) {
            try {
              await payload.delete({
                collection: 'media',
                id: oldMediaId,
                overrideAccess: true,
                req,
              })
              payload.logger.info(`Deleted old achievement media: ${oldMediaId}`)
            } catch (err) {
              payload.logger.warn(`Cleanup failed for achievement media ${oldMediaId} ${err}`)
            }
          }

          // Find the specific achievement we just updated to get its populated picture
          const targetAchievement = updatedStudent.achievements?.find(
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
