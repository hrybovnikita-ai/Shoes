const {
  initializeApp,
  applicationDefault,
  getApps,
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

console.log("SHOES: Firebase Admin initialized");

async function requireAuth(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const match = authorization.match(/^Bearer (\S+)$/i);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(
      match[1]
    );

    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired Firebase token",
    });
  }
}

module.exports = { requireAuth };
