import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Report = sequelize.define("Report", {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    disasterType: {
      type: DataTypes.ENUM('fire', 'flood', 'earthquake', 'accident', 'medical', 'storm', 'other'),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('pending', 'assigned', 'in-progress', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reporterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    coordinatorId: {          // ✅ add this
  type: DataTypes.INTEGER,
  allowNull: true,
},
  }, {
    tableName: "reports",
    timestamps: true,
  });

  return Report;
};

