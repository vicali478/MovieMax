'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecommendedMovie extends Model {
    static associate(models) {
      // handled via Movie model
    }
  }

  RecommendedMovie.init(
    {
      movie_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      recommended_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RecommendedMovie',
      tableName: 'RecommendedMovies',
    }
  );

  return RecommendedMovie;
};
