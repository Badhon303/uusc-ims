import type { Access } from 'payload'

/**
 * Any signed-in user. Tenant scoping for tenant-enabled collections is layered on
 * top of this by `@payloadcms/plugin-multi-tenant`, so an unauthenticated request
 * must never be allowed to read tenant data.
 */
export const isAuthenticated: Access = ({ req }) => Boolean(req.user)
