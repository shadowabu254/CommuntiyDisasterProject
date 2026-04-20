import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Partnership = sequelize.define("Partnership", {
    // STRING not ENUM for orgType — avoids truncation on alter
    orgName:     { type: DataTypes.STRING, allowNull: false },
    orgType:     { type: DataTypes.STRING, allowNull: false },
    orgWebsite:  { type: DataTypes.STRING, allowNull: true  },
    orgSize:     { type: DataTypes.STRING, allowNull: true  },
    county:      { type: DataTypes.STRING, allowNull: false },
    country:     { type: DataTypes.STRING, defaultValue: 'Kenya' },
    description: { type: DataTypes.TEXT,   allowNull: true  },

    contributions: { type: DataTypes.TEXT,   allowNull: true }, // comma-separated
    tier:          { type: DataTypes.STRING, allowNull: true },
    fundingAmount: { type: DataTypes.STRING, allowNull: true },
    timeline:      { type: DataTypes.STRING, allowNull: true },
    duration:      { type: DataTypes.STRING, allowNull: true },
    specificNeeds: { type: DataTypes.TEXT,   allowNull: true },

    contactName:     { type: DataTypes.STRING, allowNull: false },
    contactTitle:    { type: DataTypes.STRING, allowNull: false },
    contactEmail:    { type: DataTypes.STRING, allowNull: false },
    contactPhone:    { type: DataTypes.STRING, allowNull: false },
    altContactName:  { type: DataTypes.STRING, allowNull: true  },
    altContactEmail: { type: DataTypes.STRING, allowNull: true  },
    howHeard:        { type: DataTypes.STRING, allowNull: true  },

    // STRING not ENUM — values: pending | reviewing | active | inactive | rejected
    status:          { type: DataTypes.STRING, defaultValue: 'pending', allowNull: false },
    referenceNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
    adminNotes:      { type: DataTypes.TEXT,   allowNull: true  },
    approvedBy:      { type: DataTypes.INTEGER,allowNull: true  },
    approvedAt:      { type: DataTypes.DATE,   allowNull: true  },
  }, {
    tableName: "partnerships",
    timestamps: true,
  });

  return Partnership;
};