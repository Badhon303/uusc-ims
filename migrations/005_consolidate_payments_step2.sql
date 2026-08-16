INSERT INTO payments (
  tenant_id,
  payer_type,
  payer,
  context,
  context_ref_id,
  amount,
  payment_method,
  gateway_transaction_id,
  gateway_status,
  status,
  due_date,
  paid_at,
  invoice_number,
  created_at,
  updated_at
)
SELECT
  mp.tenant_id,
  'member',
  CAST(mp.user_id AS VARCHAR),
  'registration-fee',
  CAST(mp.id AS VARCHAR),
  mp.registration_fee,
  'cash',
  NULL,
  'migrated',
  'paid',
  mp.registration_date,
  mp.registration_date,
  CONCAT('PAY-', mp.tenant_id, '-', mp.id, '-REG'),
  mp.created_at,
  mp.updated_at
FROM member_payments mp
WHERE mp.registration_fee IS NOT NULL;

ALTER TABLE member_payments RENAME TO member_payments_legacy;
ALTER TABLE student_payments RENAME TO student_payments_legacy;
ALTER TABLE booking_payments RENAME TO booking_payments_legacy;
