"use strict";
const {pool}=require('../db');
const email=require('../email');
// History is durable, so Redis loss cannot discard notifications.
async function discover() {
 await pool.query(`INSERT INTO shoes_price_notifications(alert_id,history_id)
 SELECT a.id,h.id FROM shoes_price_alerts a JOIN shoes_price_history h ON h.product_id=a.product_id
 WHERE a.active AND h.recorded_at>a.created_at AND h.price<h.previous_price AND h.price<=a.target_price
 ON CONFLICT DO NOTHING`);
}
async function deliver(notificationId) {
 const db=await pool.connect(); let locked=false;
 try {
  locked=(await db.query('SELECT pg_try_advisory_lock($1::bigint)',[700000000+Number(notificationId)])).rows[0].pg_try_advisory_lock;
  if(!locked) throw new Error('Notification being processed');
  const n=(await db.query(`SELECT n.*,a.active,u.email,u.email_verified,p.name,h.price
   FROM shoes_price_notifications n JOIN shoes_price_alerts a ON a.id=n.alert_id
   JOIN shoes_users u ON u.id=a.user_id JOIN shoes_price_history h ON h.id=n.history_id
   JOIN shoes_products p ON p.id=h.product_id WHERE n.id=$1`,[notificationId])).rows[0];
  if(!n||n.email_status!=='pending') return;
  if(!n.active||!n.email_verified||!n.email||!email.emailEnabled()) {
   await db.query("UPDATE shoes_price_notifications SET email_status=$2 WHERE id=$1",[notificationId,!n.active?'unsubscribed':!n.email_verified?'unverified':'disabled']); return;
  }
  // Never retry an uncertain send beyond the provider's 24-hour deduplication window.
  if(n.first_attempt_at && Date.now()-new Date(n.first_attempt_at)>23*3600_000) {
   await db.query("UPDATE shoes_price_notifications SET email_status='needs_review' WHERE id=$1",[notificationId]);return;
  }
  const payload=n.email_payload||{to:n.email,subject:`SHOES price drop: ${n.name}`,text:`${n.name} is now $${Number(n.price).toFixed(2)}. View your price alerts in your SHOES account.`,html:`<p>A product on your SHOES price watch list has dropped to $${Number(n.price).toFixed(2)}. Open your SHOES account to view the details.</p>`};
  await db.query('UPDATE shoes_price_notifications SET first_attempt_at=COALESCE(first_attempt_at,NOW()),email_payload=COALESCE(email_payload,$2::jsonb) WHERE id=$1',[notificationId,JSON.stringify(payload)]);
  const result=await email.sendPriceAlert(payload,`shoes-price-${notificationId}`);
  if(!result.sent) throw new Error('Email delivery failed');
  await db.query("UPDATE shoes_price_notifications SET email_status='sent',sent_at=NOW() WHERE id=$1",[notificationId]);
 } finally { if(locked) await db.query('SELECT pg_advisory_unlock($1::bigint)',[700000000+Number(notificationId)]);db.release(); }
}
module.exports={discover,deliver};
