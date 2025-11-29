'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SeriesCrew extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SeriesCrew.belongsTo(models.Series, { foreignKey: 'seriesId', as: 'tv' });
      SeriesCrew.belongsTo(models.CastInfo, { foreignKey: 'castId', as: 'person' });
    }
  }
  SeriesCrew.init({
    seriesId: DataTypes.INTEGER,
    castId: DataTypes.INTEGER,
    department: DataTypes.STRING,
    creditId: DataTypes.STRING,
    profilePath: DataTypes.STRING,
    name: DataTypes.STRING,
    job: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'SeriesCrew',
  });
  return SeriesCrew;
};