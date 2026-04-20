import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ContactMessage = sequelize.define("ContactMessage", {
    name:    { type: DataTypes.STRING, allowNull: false },
    email:   { type: DataTypes.STRING, allowNull: false },
    phone:   { type: DataTypes.STRING, allowNull: true  },
    subject: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT,   allowNull: false },

    // STRING not ENUM — your existing DB column is a varchar
    // Accepted values: 'new' | 'read' | 'replied' | 'archived'
    type: {
      type: DataTypes.STRING,
      defaultValue: 'general',
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'new',
      allowNull: false,
    },
    reply:     { type: DataTypes.TEXT,    allowNull: true },
    repliedAt: { type: DataTypes.DATE,    allowNull: true },
    repliedBy: { type: DataTypes.INTEGER, allowNull: true },
    starred:   { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {
    tableName: "contact_messages",
    timestamps: true,
    updatedAt: false, // existing table only has createdAt
  });

  return ContactMessage;
};