import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define("Task", {
    status: { type: DataTypes.STRING, defaultValue: "assigned" },
  });
