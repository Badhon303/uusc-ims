import type { Access, CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload'
import { APIError } from 'payload'
import { getTenantSubscriptionStatus, isSuperAdminUser } from '@/utils/access/currentUser'

/**
 * Tenant field injection, tenant-scoped access, and admin list filtering are all
 * handled by `@payloadcms/plugin-multi-tenant` (see `src/payload.config.ts`).
 *
 * This module only carries the app-specific business rule that the plugin does not
 * provide: blocking mutations for tenants whose subscription is suspended/cancelled/
 * past due (super admins are always exempt).
 */
const tenantReadOnlyStatuses = new Set(['suspended', 'cancelled', 'past_due'])

const isTenantSuspended = (req: Parameters<CollectionBeforeChangeHook>[0]['req']): boolean => {
  const status = getTenantSubscriptionStatus(req)

  if (typeof status !== 'string') {
    return false
  }

  return tenantReadOnlyStatuses.has(status)
}

export const blockMutationsForSuspendedTenant: CollectionBeforeChangeHook = ({
  req,
  operation,
}) => {
  if (operation !== 'create' && operation !== 'update') {
    return
  }

  if (isSuperAdminUser(req)) {
    return
  }

  if (isTenantSuspended(req)) {
    throw new APIError(
      'Your subscription is suspended. Contact support to resume making changes.',
      403,
    )
  }
}

const isSuperAdminFromAdminUser = (user: unknown): boolean =>
  (user as { isSuperAdmin?: boolean } | null | undefined)?.isSuperAdmin === true

const denySuperAdminAccess =
  (access?: Access): Access =>
  async (args) => {
    if (isSuperAdminUser(args.req)) {
      return false
    }

    return access ? access(args) : true
  }

/**
 * Tenant-operational collections belong to a tenant workspace, not to the
 * platform-management workspace. Super admins manage tenants and users from
 * the platform collections, but do not CRUD tenant business records here.
 */
export const withSuspensionGuard = <T extends CollectionConfig>(collection: T): T => ({
  ...collection,
  admin: {
    ...collection.admin,
    hidden: ({ user }) => {
      if (isSuperAdminFromAdminUser(user)) {
        return true
      }

      if (typeof collection.admin?.hidden === 'function') {
        return collection.admin.hidden({ user })
      }

      return collection.admin?.hidden ?? false
    },
  },
  access: {
    ...collection.access,
    read: denySuperAdminAccess(collection.access?.read),
    create: denySuperAdminAccess(collection.access?.create),
    update: denySuperAdminAccess(collection.access?.update),
    delete: denySuperAdminAccess(collection.access?.delete),
  },
  hooks: {
    ...collection.hooks,
    beforeChange: [blockMutationsForSuspendedTenant, ...(collection.hooks?.beforeChange ?? [])],
  },
})

export const withTenantFieldAccess = (access?: FieldAccess): FieldAccess => {
  return async (args) => {
    const req = args.req

    if (isSuperAdminUser(req)) {
      return access ? access(args) : true
    }

    if (!req.user) {
      return false
    }

    if (isTenantSuspended(req) && !args.siblingData) {
      return false
    }

    return access ? access(args) : true
  }
}
