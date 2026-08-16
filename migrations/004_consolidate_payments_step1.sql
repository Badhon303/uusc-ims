CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  payer_type VARCHAR(20) NOT NULL,
  payer VARCHAR(100),
  context VARCHAR(50) NOT NULL,
  context_ref_id VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_status VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_number VARCHAR(100) UNIQUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, gateway_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_court_bookings_tenant_court_date ON court_bookings (tenant_id, court_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status_due_date ON payments (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_tenant_student ON student_attendance (tenant_id, student_id);
