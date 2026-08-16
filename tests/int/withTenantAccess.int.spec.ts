import { describe, expect, it } from 'vitest'
import { blockMutationsForSuspendedTenant } from '@/utils/access/withTenantAccess'

const makeArgs = (overrides: {
  user?: Record<string, unknown> | null
  operation: 'create' | 'update' | 'read' | 'delete'
}) => ({
  req: { user: overrides.user ?? null } as any,
  operation: overrides.operation,
  data: {},
  context: {},
  collection: {} as any,
})

describe('blockMutationsForSuspendedTenant', () => {
  it('allows mutations when the tenant subscription is active', () => {
    expect(() =>
      blockMutationsForSuspendedTenant(
        makeArgs({
          operation: 'update',
          user: { id: 1, role: 'admin', tenantSubscriptionStatus: 'active' },
        }) as any,
      ),
    ).not.toThrow()
  })

  it('blocks writes when the tenant subscription is suspended', () => {
    expect(() =>
      blockMutationsForSuspendedTenant(
        makeArgs({
          operation: 'update',
          user: { id: 1, role: 'admin', tenantSubscriptionStatus: 'suspended' },
        }) as any,
      ),
    ).toThrow(/suspended/i)
  })

  it('bypasses the suspension guard for super admins', () => {
    expect(() =>
      blockMutationsForSuspendedTenant(
        makeArgs({
          operation: 'update',
          user: { id: 1, isSuperAdmin: true, tenantSubscriptionStatus: 'suspended' },
        }) as any,
      ),
    ).not.toThrow()
  })

  it('does not block read operations', () => {
    expect(() =>
      blockMutationsForSuspendedTenant(
        makeArgs({
          operation: 'read',
          user: { id: 1, role: 'admin', tenantSubscriptionStatus: 'suspended' },
        }) as any,
      ),
    ).not.toThrow()
  })
})
