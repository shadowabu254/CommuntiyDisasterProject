import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host:    process.env.DB_HOST,
    port:    parseInt(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      connectTimeout: 60000,  // 60s — prevents ETIMEDOUT on cold starts
    },
    pool: {
      max:     5,
      min:     0,
      acquire: 60000,
      idle:    10000,
    },
  }
);

export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✓ Connected to MySQL database");
  } catch (err) {
    console.error("✗ DB connection error:", err.message);
    console.error("  Host:", process.env.DB_HOST);
    console.error("  Port:", process.env.DB_PORT);
    console.error("  Name:", process.env.DB_NAME);
    console.error("  User:", process.env.DB_USER);
  }
}