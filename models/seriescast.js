'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SeriesCast extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
        SeriesCast.belongsTo(models.Series, { foreignKey: 'seriesId', as: 'tv' });
        SeriesCast.belongsTo(models.CastInfo, { foreignKey: 'castId', as: 'person' });

    }
  }
  SeriesCast.init({
    seriesId: DataTypes.INTEGER,
    castId: DataTypes.INTEGER,
    character: DataTypes.STRING,
    creditId: DataTypes.STRING,
    profilePath: DataTypes.STRING,
    name: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SeriesCast',
  });
  return SeriesCast;
};