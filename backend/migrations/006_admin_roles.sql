
-- 006: Role-based access control for SHOES.
-- Existing users remain customers.

ALTER TABLE shoes_users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

-- Add role constraint only if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shoes_users_role_check'
      AND conrelid = 'shoes_users'::regclass
  ) THEN
    ALTER TABLE shoes_users
    ADD CONSTRAINT shoes_users_role_check
    CHECK (role IN ('customer', 'admin'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_shoes_users_role
ON shoes_users (role);
