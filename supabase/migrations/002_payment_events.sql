-- ─── payment_events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_events (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id     text          NOT NULL,
  title             text          NOT NULL,
  description       text,
  total_amount      numeric(10,2) NOT NULL,
  amount_mode       text          NOT NULL,  -- 'equal_split' | 'custom' | 'open'
  payout_account_id uuid          REFERENCES payout_accounts(id),
  status            text          NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'cancelled'
  created_at        timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;

-- ─── payment_event_payers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_event_payers (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_event_id   uuid          NOT NULL REFERENCES payment_events(id) ON DELETE CASCADE,
  name               text          NOT NULL,
  phone_number       text          NOT NULL,
  amount_owed        numeric(10,2) NOT NULL,
  payment_status     text          NOT NULL DEFAULT 'unpaid',  -- 'unpaid' | 'paid' | 'failed' | 'cancelled'
  payment_token      uuid          NOT NULL DEFAULT gen_random_uuid(),
  paid_at            timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE payment_event_payers DISABLE ROW LEVEL SECURITY;
