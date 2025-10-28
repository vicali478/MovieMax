"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SeriesTrailer extends Model {
    static associate(models) {
      SeriesTrailer.belongsTo(models.Series, { foreignKey: "seriesId", as: "series" });
    }
  }

  SeriesTrailer.init(
    {
      seriesId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      site: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SeriesTrailer",
      tableName: "SeriesTrailers",
    }
  );

  return SeriesTrailer;
};
