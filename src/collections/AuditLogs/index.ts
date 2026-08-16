import type { CollectionConfig } from 'payload'
import { isSuperAdminUser } from '@/utils/access/currentUser'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: 'Audit Log',
    plural: 'Audit Logs',
  },
  admin: {
    useAsTitle: 'action',
    group: 'Platform',
    defaultColumns: ['action', 'collection', 'documentId', 'createdAt'],
  },
  access: {
    read: ({ req }) => isSuperAdminUser(req),
    // Written by the platform on behalf of any signed-in user
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => isSuperAdminUser(req),
    delete: ({ req }) => isSuperAdminUser(req),
    admin: ({ req }) => isSuperAdminUser(req),
  },
  fields: [
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      required: false,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'action',
          type: 'text',
          required: true,
        },
        {
          name: 'collection',
          type: 'text',
          required: true,
        },
        {
          name: 'documentId',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'diff',
      type: 'json',
    },
    {
      name: 'ip',
      type: 'text',
    },
  ],
  timestamps: true,
}
