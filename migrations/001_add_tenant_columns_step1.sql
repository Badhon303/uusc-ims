CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo_id INTEGER,
  address TEXT,
  contact_number VARCHAR(50),
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Dhaka',
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  settings JSONB,
  subscription_plan INTEGER,
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trialing',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  grace_period_days INTEGER NOT NULL DEFAULT 3,
  auto_suspend_on_expiry BOOLEAN NOT NULL DEFAULT TRUE,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: users.tenant_id is no longer used — @payloadcms/plugin-multi-tenant
-- manages user-tenant relationships via its own junction table (users_tenants).
-- The is_super_admin and tenant_subscription_status columns are still managed
-- manually on the users table.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE members ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE managers ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE staffs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE court_bookings ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE training_groups ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE training_schedules ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE member_schedules ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE member_payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE student_payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE booking_payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE tournament_results ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE expenditures ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE other_incomes ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE coach_salaries ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
