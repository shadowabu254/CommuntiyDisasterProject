import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Message = sequelize.define("Message", {
    senderId:   { type: DataTypes.INTEGER, allowNull: false },
    receiverId: { type: DataTypes.INTEGER, allowNull: false },
    reportId:   { type: DataTypes.INTEGER, allowNull: true  },
    message:    { type: DataTypes.TEXT,    allowNull: true  },
    fileUrl:    { type: DataTypes.TEXT,    allowNull: true  },
    fileName:   { type: DataTypes.STRING,  allowNull: true  },
    fileType:   { type: DataTypes.STRING,  allowNull: true  },
    replyToId:  { type: DataTypes.INTEGER, allowNull: true  },
    status: {
      type:         DataTypes.STRING,
      defaultValue: 'sent',
      allowNull:    false,
    },
  }, {
    tableName:  "messages",
    timestamps: true,
  });

  return Message;
};