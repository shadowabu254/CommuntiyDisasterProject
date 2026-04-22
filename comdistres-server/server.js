import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./db.js";
import db from "./models/index.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import reportRoutes from "./routes/reports.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import contactRoutes from "./routes/contact.js";
import volunteerRoutes from "./routes/volunteers.js";
import partnershipRoutes from "./routes/partnerships.js";
import { chatSocket } from "./sockets/chatSocket.js";
import { mountSwagger } from "./docs/swagger.js";
import cookieParser from "cookie-parser";
import notificationRoutes from './routes/notifications.js';

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [ process.env.CLIENT_ORIGIN , "http://localhost:3000" , "https://desastersystem.onrender.com" ],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use('/api/notifications', notificationRoutes);
// TEMPORARY FIX — remove after use
// app.get('/fix-users', async (req, res) => {
//   try {
//     await db.sequelize.query('UPDATE users SET isactive = 1 WHERE isactive = 0 OR isactive IS NULL');
//     const [users] = await db.sequelize.query('SELECT id, name, email, isactive FROM users');
//     res.json({ message: 'All users activated!', users });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
app.get("/", (req, res) => {
  res.send("Community Disaster Management API is running 🚀");
});
// ── DB ─────────────────────────────────────────────────────────────────────
connectDB();
db.sequelize.authenticate()
  .then(() => console.log("✓ Database connected:", process.env.DB_NAME))
  .catch(err => console.error("✗ Database error:", err.message));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/users",            userRoutes);
app.use("/api/reports",      reportRoutes);
app.use("/api/chat",         chatRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/contact",      contactRoutes);
app.use("/api/volunteers",   volunteerRoutes);
app.use("/api/partnerships", partnershipRoutes);
mountSwagger(app);

// ── ONE single HTTP server — shared by Express AND Socket.io ──────────────
// Previously there were TWO servers (http.createServer + createServer) but
// Socket.io was attached to one and listen() called on the other — so
// sockets never actually connected. Now there is only one.
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ process.env.CLIENT_ORIGIN , "http://localhost:3000" , "https://desastersystem.onrender.com" ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

chatSocket(io);

// ── Listen ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✓ Server + Socket.io running on port ${PORT}`);
  console.log(`  API:    http://localhost:${PORT}/api`);
  console.log(`  Socket: ws://localhost:${PORT}`);
});