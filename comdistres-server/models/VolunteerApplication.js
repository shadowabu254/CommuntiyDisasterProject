import { DataTypes } from "sequelize";

export default (sequelize) => {
  const VolunteerApplication = sequelize.define("VolunteerApplication", {
    firstName: { type: DataTypes.STRING,  allowNull: false },
    lastName:  { type: DataTypes.STRING,  allowNull: false },
    email:     { type: DataTypes.STRING,  allowNull: false },
    phone:     { type: DataTypes.STRING,  allowNull: false },
    idNumber:  { type: DataTypes.STRING,  allowNull: true  },
    county:    { type: DataTypes.STRING,  allowNull: false },
    town:      { type: DataTypes.STRING,  allowNull: true  },
    address:   { type: DataTypes.STRING,  allowNull: true  },

    // Arrays are joined to CSV strings before saving
    skills:          { type: DataTypes.TEXT,    allowNull: true },
    otherSkills:     { type: DataTypes.TEXT,    allowNull: true },
    hasVehicle:      { type: DataTypes.BOOLEAN, defaultValue: false },
    hasFirstAidCert: { type: DataTypes.BOOLEAN, defaultValue: false },
    languages:       { type: DataTypes.STRING,  allowNull: true },

    availableDays:   { type: DataTypes.TEXT,    allowNull: true },
    availableTimes:  { type: DataTypes.TEXT,    allowNull: true },
    hoursPerMonth:   { type: DataTypes.STRING,  allowNull: true },
    startDate:       { type: DataTypes.DATEONLY,allowNull: true },
    remoteAvailable: { type: DataTypes.BOOLEAN, defaultValue: false },

    // STRING not ENUM — avoids truncation errors on new tables too
    experienceLevel: { type: DataTypes.STRING, defaultValue: 'none', allowNull: true },
    previousOrg:     { type: DataTypes.STRING, allowNull: true },
    whyVolunteer:    { type: DataTypes.TEXT,   allowNull: false },

    emergencyContactName:  { type: DataTypes.STRING, allowNull: false },
    emergencyContactPhone: { type: DataTypes.STRING, allowNull: false },
    medicalConditions:     { type: DataTypes.TEXT,   allowNull: true  },

    // STRING not ENUM — values: pending | reviewing | approved | rejected | on_hold
    status:          { type: DataTypes.STRING, defaultValue: 'pending', allowNull: false },
    referenceNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
    adminNotes:      { type: DataTypes.TEXT,   allowNull: true },
    reviewedBy:      { type: DataTypes.INTEGER,allowNull: true },
  }, {
    tableName: "volunteer_applications",
    timestamps: true,
  });

  return VolunteerApplication;
};