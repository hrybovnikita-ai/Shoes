require("dotenv").config();

const app = require("./app");
const { initDb } = require("./db");

const PORT = Number(process.env.PORT) || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SHOES API: http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
