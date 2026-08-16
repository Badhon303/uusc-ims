INSERT INTO tenants (name, slug, subscription_status, billing_cycle, grace_period_days, auto_suspend_on_expiry, is_active)
SELECT 'Indoor 1', 'indoor-1', 'active', 'monthly', 3, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'indoor-1');

-- NOTE: User-tenant relationships are now managed by @payloadcms/plugin-multi-tenant
-- via its own junction table. Run `pnpm tsx scripts/backfill-default-tenant.ts` instead
-- of this SQL to backfill user-tenant associations.
UPDATE members SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE students SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE coaches SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE managers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE staffs SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE courts SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE court_bookings SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE training_groups SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE training_schedules SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE member_schedules SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE student_attendance SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE student_progress SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE packages SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE member_payments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE student_payments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE booking_payments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE tournaments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE tournament_registrations SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE tournament_teams SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE tournament_matches SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE tournament_results SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE expenditures SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE other_incomes SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE coach_salaries SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;
UPDATE sponsors SET tenant_id = (SELECT id FROM tenants WHERE slug = 'indoor-1' LIMIT 1) WHERE tenant_id IS NULL;

ALTER TABLE members ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE students ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE coaches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE managers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE staffs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE courts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE court_bookings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE training_groups ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE training_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE member_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE student_attendance ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE student_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE packages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE member_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE student_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE booking_payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tournaments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tournament_registrations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tournament_teams ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tournament_matches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tournament_results ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE expenditures ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE other_incomes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE coach_salaries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sponsors ALTER COLUMN tenant_id SET NOT NULL;
