'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecommendedSeries extends Model {
    static associate(models) {
      // handled via Series model
    }
  }

  RecommendedSeries.init(
    {
      seriesId: {
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
      modelName: 'RecommendedSeries',
      tableName: 'RecommendedSeries',
    }
  );

  return RecommendedSeries;
};
