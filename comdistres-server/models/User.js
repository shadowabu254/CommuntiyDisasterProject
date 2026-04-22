import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define("User", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isactive: {  
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 4,
    },
  }, {
    tableName: "users",
    timestamps: true,
  });

  return User;
};