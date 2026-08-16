import type { Access, FieldAccess } from 'payload'
import { isSuperAdminUser } from '@/utils/access/currentUser'

/**
 * Collection/global access: platform-level (cross-tenant) data is super admin only.
 */
export const isSuperAdmin: Access = ({ req }) => isSuperAdminUser(req)

/**
 * Field access: only super admins may write (or read) the field.
 */
export const isSuperAdminField: FieldAccess = ({ req }) => isSuperAdminUser(req)
