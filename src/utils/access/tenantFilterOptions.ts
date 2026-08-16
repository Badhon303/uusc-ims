import type { PayloadRequest, Where } from 'payload'
import { getTenantIdFromUser, isSuperAdminUser } from './currentUser'

/**
 * Returns a `where` clause for `filterOptions` on `users` relationships that
 * restricts the admin dropdown to users in the current user's tenant.
 *
 * Super admins see all users. If the current user has no tenant, no options
 * are returned (id = -1 sentinel).
 *
 * @param req   The Payload request object
 * @param role  Optional role to further restrict the dropdown (e.g. 'member')
 */
export const tenantScopedUserFilter = (req: PayloadRequest, role?: string): Where => {
  const filter: Where = {}

  if (role) {
    filter.role = { equals: role }
  }

  if (isSuperAdminUser(req)) {
    return filter
  }

  const tenantId = getTenantIdFromUser(req)

  if (!tenantId) {
    return { id: { equals: -1 } }
  }

  filter['tenants.tenant'] = { equals: tenantId }
  return filter
}
