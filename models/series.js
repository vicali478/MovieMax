"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Series extends Model {
    static associate(models) {
      Series.hasMany(models.Season, { foreignKey: "seriesId", as: "seasons" });

      Series.hasMany(models.SeriesCast, { foreignKey: 'seriesId', as: 'casts' });
      Series.hasMany(models.SeriesCrew, { foreignKey: 'seriesId', as: 'crews' });
      Series.hasMany(models.SeriesTrailer, { foreignKey: 'seriesId', as: 'trailers' });
      Series.belongsToMany(models.Series, {
        through: 'RecommendedSeries',
        as: 'recommendations', // Series recommended by this Series
        foreignKey: 'seriesId',
        otherKey: 'recommended_id',
      });

      // Optional reverse relation (Series that recommend this one)
      Series.belongsToMany(models.Series, {
        through: 'RecommendedSeries',
        as: 'recommendedBy',
        foreignKey: 'recommended_id',
        otherKey: 'seriesId',
      });
    }
  }

  Series.init(
    {
      f_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      posterUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      firstAirDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      voteAverage: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      runtime: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      genres: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tmdbId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      imdbId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      titleLong: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      homepage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      synopsis: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      mpaRating: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      productionCompanies: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      productionCountries: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      spokenLanguages: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      backdropUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      voteCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      popularity: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      published: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      next_update: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tagline: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      watchProviders: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Series",
      tableName: "Series",
    }
  );

  return Series;
};
