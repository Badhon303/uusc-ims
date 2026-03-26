import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: '🌄 Picture',
    plural: '🌄 Pictures',
  },
  admin: {
    useAsTitle: 'alt',
    group: '⚙️ Settings',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    staticDir: 'media', // Ensure you have your directory defined
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
      },
    ],
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if ((operation === 'create' || operation === 'update') && args.req.file) {
          const file = args.req.file
          const fileSize = file.data ? file.data.length : 0

          // 1. Enforce 2MB limit
          if (fileSize > 2097152) {
            throw new APIError('File size must be less than 2MB', 400)
          }

          // 2. Professional Naming Logic (Date & Time)
          const extension = file.name.split('.').pop()
          const now = new Date()

          // YYYYMMDD format
          const datePart = now.toISOString().split('T')[0].replace(/-/g, '')

          // HHMMSS format (Hours, Minutes, Seconds)
          const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '')

          const hash = Math.random().toString(36).substring(2, 6).toUpperCase()

          // Result: INV-20260108-134530.pdf
          file.name = `PIC-${datePart}-${timePart}-${hash}.${extension}`
        }
      },
    ],
  },
}
