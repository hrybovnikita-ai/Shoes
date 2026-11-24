"use strict";
// Sync verified Clerk webhook payloads into shoes_users.
// Never link rows by e-mail alone — only by clerk_user_id.

function primaryEmail(data) {
  const list = data.email_addresses || [];
  const primary =
    list.find((e) => e.id === data.primary_email_address_id) || list[0] || null;
  if (!primary) return { email: null, emailVerified: false };
  return {
    email: primary.email_address ? String(primary.email_address).toLowerCase() : null,
    emailVerified: primary.verification?.status === "verified",
  };
}

function displayName(data) {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name || data.username || null;
}

async function upsertClerkProfile(client, data) {
  const clerkUserId = data.id;
  if (!clerkUserId || typeof clerkUserId !== "string") {
    throw new Error("Clerk webhook missing user id");
  }
  const { email, emailVerified } = primaryEmail(data);
  const name = displayName(data);
  const picture = data.image_url || null;

  const { rows } = await client.query(
    `INSERT INTO shoes_users (clerk_user_id, email, email_verified, display_name, avatar_url, last_login_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (clerk_user_id) DO UPDATE SET
       email = CASE
         WHEN EXCLUDED.email IS NOT NULL AND EXCLUDED.email_verified THEN EXCLUDED.email
         WHEN shoes_users.email IS NULL THEN EXCLUDED.email
         ELSE shoes_users.email
       END,
       email_verified = CASE
         WHEN EXCLUDED.email IS NOT NULL THEN EXCLUDED.email_verified
         ELSE shoes_users.email_verified
       END,
       display_name = COALESCE(EXCLUDED.display_name, shoes_users.display_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, shoes_users.avatar_url),
       updated_at = NOW()
     RETURNING id`,
  [clerkUserId, email, emailVerified, name, picture],
  );
  return rows[0];
}

async function softDeleteClerkProfile(client, clerkUserId) {
  if (!clerkUserId) return null;
  const { rows } = await client.query(
    `UPDATE shoes_users SET
       email = NULL,
       email_verified = FALSE,
       display_name = 'Former member',
       avatar_url = NULL,
       updated_at = NOW()
     WHERE clerk_user_id = $1 AND merged_into IS NULL
     RETURNING id`,
    [clerkUserId],
  );
  return rows[0] || null;
}

module.exports = { upsertClerkProfile, softDeleteClerkProfile, primaryEmail, displayName };