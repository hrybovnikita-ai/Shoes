"use strict";

const express = require("express");
const { pool } = require("../db");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(...requireAdmin);

router.get("/me", (req, res) => {
  res.json({
    success: true,
    role: "admin",
    user: req.adminUser,
  });
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "SHOES Admin API",
  });
});

router.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int
         FROM shoes_users
         WHERE merged_into IS NULL) AS users,

        (SELECT COUNT(*)::int
         FROM shoes_orders) AS orders,

        (SELECT COUNT(*)::int
         FROM shoes_orders
         WHERE payment_status = 'paid'
           AND paid_at IS NOT NULL
           AND payment_provider <> 'demo') AS paid_orders,

        (SELECT COALESCE(SUM(total), 0)
         FROM shoes_orders
         WHERE payment_status = 'paid'
           AND paid_at IS NOT NULL
           AND payment_provider <> 'demo') AS revenue,

        (SELECT COUNT(*)::int
         FROM shoes_orders
         WHERE payment_status = 'unpaid') AS unpaid_orders
    `);

    res.json({
      success: true,
      stats: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

function getPaging(req) {
  const page = Math.min(
    10000,
    Math.max(1, Number.parseInt(req.query.page, 10) || 1),
  );

  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

router.get("/orders", async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaging(req);

    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.created_at,
         o.payment_status,
         o.payment_provider,
         o.customer_email,
         o.user_id,
         o.fulfillment_status,
         o.tracking_number,
         u.display_name AS customer_name
       FROM shoes_orders AS o
       LEFT JOIN shoes_users AS u
         ON u.id = o.user_id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      success: true,
      orders: rows,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const { page, limit, offset } = getPaging(req);

    const { rows } = await pool.query(
      `SELECT
         id,
         email,
         display_name,
         role,
         created_at,
         last_login_at,
         (firebase_uid IS NOT NULL) AS firebase,
         (clerk_user_id IS NOT NULL) AS clerk
       FROM shoes_users
       WHERE merged_into IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      success: true,
      users: rows,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
