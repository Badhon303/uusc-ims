import { describe, expect, it } from 'vitest'
import { resolveReportTenantScope } from '@/utils/access/tenantReport'

const makeReq = (overrides: {
  user?: Record<string, unknown> | null
  query?: Record<string, unknown>
}) =>
  ({
    user: overrides.user ?? null,
    query: overrides.query ?? {},
  }) as any

describe('resolveReportTenantScope', () => {
  it('scopes non-super-admin users to their own tenant', () => {
    const scope = resolveReportTenantScope(
      makeReq({
        user: { id: 1, role: 'admin', tenants: [{ tenant: 'tenant-a' }] },
      }),
    )

    expect(scope).toEqual({ tenantId: 'tenant-a', isSuperAdmin: false })
  })

  it('returns platform-wide scope for super admins with no tenantId query param', () => {
    const scope = resolveReportTenantScope(
      makeReq({
        user: { id: 1, isSuperAdmin: true },
      }),
    )

    expect(scope).toEqual({ tenantId: null, isSuperAdmin: true })
  })

  it('lets super admins scope reports to a specific tenant via query param', () => {
    const scope = resolveReportTenantScope(
      makeReq({
        user: { id: 1, isSuperAdmin: true },
        query: { tenantId: 'tenant-b' },
      }),
    )

    expect(scope).toEqual({ tenantId: 'tenant-b', isSuperAdmin: true })
  })

  it('returns a null tenantId for non-super-admin users with no tenant assigned', () => {
    const scope = resolveReportTenantScope(
      makeReq({
        user: { id: 1, role: 'admin', tenants: [] },
      }),
    )

    expect(scope).toEqual({ tenantId: null, isSuperAdmin: false })
  })
})
