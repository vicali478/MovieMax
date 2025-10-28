"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Episode extends Model {
    static associate(models) {
      this.belongsTo(models.Season, { foreignKey: "seasonId", as: "season" });
    }
  }

  Episode.init(
    {
      seasonId: {
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
      episodeNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
      },
      synopsis: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      stillUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      airDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      runtime: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      seasonNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      showTMDBId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      videoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sourceUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      auxillarySourceUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      downloadUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Episode",
      tableName: "Episodes",
    }
  );

  return Episode;
};
