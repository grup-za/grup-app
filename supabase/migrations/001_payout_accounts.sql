-- Helper: extract Clerk user ID from the JWT sub claim.
-- Once Clerk's JWT template is wired to Supabase, this resolves
-- automatically on every authenticated request.
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    ''
  )::text;
$$;

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payout_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id  text        NOT NULL,
  display_name   text        NOT NULL,
  bank_name      text        NOT NULL,
  account_number text        NOT NULL,
  branch_code    text        NOT NULL,
  account_type   text        NOT NULL,
  is_default     boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout accounts"
  ON payout_accounts FOR SELECT
  USING (requesting_user_id() = clerk_user_id);

CREATE POLICY "Users can insert own payout accounts"
  ON payout_accounts FOR INSERT
  WITH CHECK (requesting_user_id() = clerk_user_id);

CREATE POLICY "Users can update own payout accounts"
  ON payout_accounts FOR UPDATE
  USING (requesting_user_id() = clerk_user_id);

CREATE POLICY "Users can delete own payout accounts"
  ON payout_accounts FOR DELETE
  USING (requesting_user_id() = clerk_user_id);
