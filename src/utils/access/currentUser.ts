import type { PayloadRequest } from 'payload'

type RelationshipValue = number | string | { id?: number | string | null } | null | undefined

type TenantArrayRow = { id?: string | null; tenant?: RelationshipValue }

export type AppRequestUser = Omit<NonNullable<PayloadRequest['user']>, 'role'> & {
  isSuperAdmin?: boolean | null
  role?:
    | 'super-admin'
    | 'admin'
    | 'manager'
    | 'coach'
    | 'staff'
    | 'member'
    | 'student'
    | 'guest'
    | null
  // Managed by @payloadcms/plugin-multi-tenant (array field on the admin users collection)
  tenants?: TenantArrayRow[] | null
  // Legacy singular field retained only for backward compatibility during migration
  tenant?: RelationshipValue
  tenantSubscriptionStatus?: string | null
}

export const getCurrentUser = (req: PayloadRequest): AppRequestUser | null => {
  return (req.user as AppRequestUser | null | undefined) ?? null
}

export const isSuperAdminUser = (req: PayloadRequest): boolean => {
  return getCurrentUser(req)?.isSuperAdmin === true
}

const relationshipToId = (value: RelationshipValue): number | string | null => {
  if (!value) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && 'id' in value) {
    return typeof value.id === 'string' || typeof value.id === 'number' ? value.id : null
  }

  return null
}

export const getAllTenantIdsFromUser = (req: PayloadRequest): Array<number | string> => {
  const tenants = getCurrentUser(req)?.tenants

  if (!Array.isArray(tenants) || !tenants.length) {
    return []
  }

  return tenants
    .map((row) => relationshipToId(row?.tenant))
    .filter((id): id is number | string => id !== null)
}

export const getTenantIdFromUser = (req: PayloadRequest): number | string | null => {
  const [firstTenantId] = getAllTenantIdsFromUser(req)

  if (firstTenantId !== undefined) {
    return firstTenantId
  }

  // Legacy fallback for any user docs not yet migrated to the `tenants` array field
  return relationshipToId(getCurrentUser(req)?.tenant)
}

export const getTenantSubscriptionStatus = (req: PayloadRequest): string | null => {
  const status = getCurrentUser(req)?.tenantSubscriptionStatus
  return typeof status === 'string' ? status : null
}

export const hasAnyRole = (req: PayloadRequest, roles: string[]): boolean => {
  const user = getCurrentUser(req)

  if (!user?.role) {
    return false
  }

  return roles.includes(user.role)
}
