import bcrypt from "bcryptjs";
import { sequelize } from "../db.js";
import UserModel from "../models/User.js";

const User = UserModel(sequelize);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected — creating admin (if not exists)...");

    const existing = await User.findOne({
      where: { email: "admin@example.com" },
    });

    if (existing) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hash = await bcrypt.hash("Admin123!", 10);

    await User.create({
      name: "System Admin",
      email: "admin@example.com",
      passwordHash: hash, // 🔥 CORRECT FIELD
      role: 1,
    });

    console.log("Admin created successfully");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create admin:", err);
    process.exit(1);
  }
})();
