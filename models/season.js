"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Season extends Model {
    static associate(models) {
      this.belongsTo(models.Series, { foreignKey: "seriesId", as: "series" });
      this.hasMany(models.Episode, { foreignKey: "seasonId", as: "episodes" });
    }
  }

  Season.init(
    {
      seriesId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      f_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      tmdbId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      seasonNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      synopsis: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      posterUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      airDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      numberOfEpisodes: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      voteAverage: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Season",
      tableName: "Seasons",
    }
  );

  return Season;
};
