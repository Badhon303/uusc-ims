import type { PayloadRequest } from 'payload'
import { isSuperAdminUser } from '@/utils/access/currentUser'

export const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export const addMonths = (value: Date, months: number) => {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

export const resolveRelationshipId = (value: unknown): number | string | null => {
  if (!value) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = value.id
    return typeof id === 'string' || typeof id === 'number' ? id : null
  }

  return null
}

export const requireSuperAdmin = (req: PayloadRequest) => {
  return isSuperAdminUser(req)
}

type PlatformSettingsFallback = {
  trialDurationDaysDefault: number
  defaultGracePeriodDays: number
  billingReminderDaysBefore: number
  readOnlyOnSuspended: boolean
}

export const getPlatformSettings = async (
  req: PayloadRequest,
): Promise<PlatformSettingsFallback> => {
  try {
    // System read: platform settings are super-admin only, but scheduled jobs and
    // tenant hooks (which may run without a user) still need the configured values.
    const result = await req.payload.findGlobal({
      slug: 'platform-settings' as never,
      req,
      overrideAccess: true,
    } as any)
    return result as PlatformSettingsFallback
  } catch {
    return {
      trialDurationDaysDefault: 14,
      defaultGracePeriodDays: 3,
      billingReminderDaysBefore: 3,
      readOnlyOnSuspended: true,
    }
  }
}

export type SubscriptionPlanSummary = {
  id: number | string
  billingType?: 'one-time' | 'recurring' | null
  currency?: string | null
  monthlyPrice?: number | null
  name?: string | null
  oneTimePrice?: number | null
  setupFee?: number | null
}

export const getSubscriptionPlan = async (
  req: PayloadRequest,
  planId: number | string,
): Promise<SubscriptionPlanSummary | null> => {
  try {
    return (await req.payload.findByID({
      collection: 'subscription-plans' as never,
      id: planId as never,
      depth: 0,
      req,
      overrideAccess: true,
    })) as unknown as SubscriptionPlanSummary
  } catch {
    return null
  }
}

export type InvoiceLineItem = {
  amount: number
  kind: 'one-time' | 'setup-fee' | 'subscription'
  label: string
}

/**
 * Builds the charges a tenant owes for its current plan.
 *
 * - recurring plan -> one `subscription` line for the monthly price
 * - one-time plan  -> one `one-time` line for the lifetime price
 * - either plan    -> a `setup-fee` line, but only until the fee has been paid once
 */
export const buildPlanLineItems = ({
  plan,
  includeSetupFee,
}: {
  plan: SubscriptionPlanSummary
  includeSetupFee: boolean
}): InvoiceLineItem[] => {
  const lineItems: InvoiceLineItem[] = []
  const isOneTime = plan.billingType === 'one-time'

  const planAmount = isOneTime ? plan.oneTimePrice : plan.monthlyPrice

  if (typeof planAmount === 'number') {
    lineItems.push({
      amount: planAmount,
      kind: isOneTime ? 'one-time' : 'subscription',
      label: isOneTime
        ? `${plan.name || 'Plan'} — one-time purchase`
        : `${plan.name || 'Plan'} — monthly subscription`,
    })
  }

  if (includeSetupFee && typeof plan.setupFee === 'number' && plan.setupFee > 0) {
    lineItems.push({
      amount: plan.setupFee,
      kind: 'setup-fee',
      label: `${plan.name || 'Plan'} — one-time setup fee`,
    })
  }

  return lineItems
}

export const sumLineItems = (lineItems?: Array<{ amount?: number | null }> | null): number => {
  if (!Array.isArray(lineItems) || !lineItems.length) {
    return 0
  }

  return lineItems.reduce((total, line) => total + (Number(line?.amount) || 0), 0)
}

export const createSubscriptionEvent = async ({
  req,
  tenant,
  eventType,
  fromValue,
  toValue,
  note,
  triggeredBy,
}: {
  req: PayloadRequest
  tenant: number | string
  eventType: string
  fromValue?: unknown
  toValue?: unknown
  note?: string
  triggeredBy?: number | string | null
}) => {
  return req.payload.create({
    collection: 'subscription-events' as never,
    data: {
      tenant,
      eventType,
      fromValue,
      toValue,
      note,
      triggeredBy: triggeredBy ?? resolveRelationshipId(req.user?.id),
    },
    req,
  } as any)
}

export const syncTenantUsersSubscriptionStatus = async ({
  req,
  tenantId,
  status,
}: {
  req: PayloadRequest
  tenantId: number | string
  status: string
}) => {
  // System sync triggered by tenant changes and scheduled jobs, which have no user.
  // Uses a single set-based update with a `where` clause instead of one update
  // per user, which avoids O(n) database round-trips for large tenants.
  await req.payload.update({
    collection: 'users',
    where: {
      'tenants.tenant': {
        equals: tenantId,
      },
    },
    data: {
      tenantSubscriptionStatus: status,
    },
    req,
    overrideAccess: true,
  } as any)
}
