"use strict";

const { requireAuth } = require("../firebaseAdmin");


function checkAdminRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Administrator access required",
    });
  }

  req.adminUser = {
    id: String(req.user.id),
    email: req.user.email || null,
    role: "admin",
  };

  return next();
}


module.exports = [requireAuth, checkAdminRole];
