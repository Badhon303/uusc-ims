import { describe, expect, it } from 'vitest'
import type { CollectionConfig } from 'payload'
import { withSuspensionGuard } from '@/utils/access/withTenantAccess'

describe('withSuspensionGuard', () => {
  it('preserves existing hooks and prepends the suspension guard', () => {
    const existingHook = async () => {}
    const collection: CollectionConfig = {
      slug: 'example',
      fields: [],
      hooks: {
        beforeChange: [existingHook],
      },
    }

    const wrapped = withSuspensionGuard(collection)

    expect(wrapped.hooks?.beforeChange).toHaveLength(2)
    expect(wrapped.hooks?.beforeChange?.[1]).toBe(existingHook)
  })

  it('does not mutate fields or access on the original collection', () => {
    const collection: CollectionConfig = {
      slug: 'example',
      fields: [{ name: 'title', type: 'text' }],
      access: {
        read: () => true,
      },
    }

    const wrapped = withSuspensionGuard(collection)

    expect(wrapped.fields).toBe(collection.fields)
    expect(wrapped.access).toBe(collection.access)
  })
})
