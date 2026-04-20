import { Sequelize } from "sequelize";
import UserModel from "./User.js";
import ReportModel from "./Report.js";
import ContactMessageModel from "./ContactMessage.js";
import VolunteerApplicationModel from "./VolunteerApplication.js";
import PartnershipModel from "./Partnership.js";
import dotenv from "dotenv";
import MessageModel from "./Message.js";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ── Initialize models ──────────────────────────────────────────────────────
db.User                 = UserModel(sequelize);
db.Report               = ReportModel(sequelize);
db.ContactMessage       = ContactMessageModel(sequelize);
db.Message              = MessageModel(sequelize);
db.VolunteerApplication = VolunteerApplicationModel(sequelize);
db.Partnership          = PartnershipModel(sequelize);

// ── Associations ───────────────────────────────────────────────────────────
db.User.hasMany(db.Report,   { foreignKey: 'reporterId', as: 'reports'  });
db.Report.belongsTo(db.User, { foreignKey: 'reporterId', as: 'reporter' });
db.Message.belongsTo(db.User, { foreignKey: "senderId",   as: "sender"   });
db.Message.belongsTo(db.User, { foreignKey: "receiverId", as: "receiver" });
db.User.hasMany(db.Message,   { foreignKey: "senderId",   as: "sentMessages"     });
db.User.hasMany(db.Message,   { foreignKey: "receiverId", as: "receivedMessages" });
 
db.VolunteerApplication.belongsTo(db.User, { foreignKey: 'reviewedBy', as: 'reviewer' });
db.Partnership.belongsTo(db.User,          { foreignKey: 'approvedBy', as: 'approver' });
db.ContactMessage.belongsTo(db.User,       { foreignKey: 'repliedBy',  as: 'replier'  });

// ── Sync strategy ──────────────────────────────────────────────────────────
// Instead of alter:true on ALL tables (which breaks existing ENUM columns),
// we only create NEW tables that don't exist yet, leaving existing tables untouched.
// Then we manually add only the new columns to contact_messages if missing.
const syncDB = async () => {
  try {
    // sync({ force: false }) = CREATE TABLE IF NOT EXISTS — never touches existing tables
    await db.Message.sync({ force: false });
    await db.ContactMessage.sync({ force: false });
    await db.VolunteerApplication.sync({ force: false });
    await db.Partnership.sync({ force: false });
    // User and Report already exist — just validate connection, don't alter
    await db.User.sync({ force: false });
    await db.Report.sync({ force: false });

    // Manually add new columns to contact_messages if they don't already exist
    const qi = sequelize.getQueryInterface();
    const tableDesc = await qi.describeTable('contact_messages');

    const newColumns = {
      reply:     { type: Sequelize.TEXT,    allowNull: true },
      repliedAt: { type: Sequelize.DATE,    allowNull: true },
      repliedBy: { type: Sequelize.INTEGER, allowNull: true },
      starred:   { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true },
    };

    for (const [colName, colDef] of Object.entries(newColumns)) {
      if (!tableDesc[colName]) {
        await queryInterface.addColumn('contact_messages', colName, colDef);
        console.log(`✅ Added column: contact_messages.${colName}`);
      }
    }
      const msgDesc = await qi.describeTable("messages");
    if (!msgDesc.replyToId) {
      await qi.addColumn("messages", "replyToId", { type: Sequelize.INTEGER, allowNull: true });
      console.log("✅ Added column messages.replyToId");
    }

    console.log("✅ DB synced — tables ready: reports, users, contact_messages, volunteer_applications, partnerships");
  } catch (err) {
    console.error("❌ DB sync error:", err.message);
  }
};

syncDB();

export default db;