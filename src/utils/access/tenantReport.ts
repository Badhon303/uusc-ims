import type { PayloadRequest } from 'payload'
import { getTenantIdFromUser, isSuperAdminUser } from '@/utils/access/currentUser'

export type ReportTenantScope = {
  tenantId: number | string | null
  isSuperAdmin: boolean
}

/**
 * Resolves the tenant a raw-SQL report endpoint should be scoped to.
 *
 * - Non-super-admins are always scoped to their own tenant (or forbidden if they
 *   somehow have none).
 * - Super admins see platform-wide totals by default, but may pass `?tenantId=`
 *   to scope the report to a single tenant.
 */
export const resolveReportTenantScope = (req: PayloadRequest): ReportTenantScope => {
  const isSuperAdmin = isSuperAdminUser(req)

  if (isSuperAdmin) {
    const queryTenantId = (req.query as Record<string, unknown> | undefined)?.tenantId

    const tenantId =
      typeof queryTenantId === 'string' || typeof queryTenantId === 'number' ? queryTenantId : null

    return { tenantId, isSuperAdmin: true }
  }

  return { tenantId: getTenantIdFromUser(req), isSuperAdmin: false }
}
