'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cast extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
        Cast.belongsTo(models.Movie, { foreignKey: 'movie_id', as: 'movie' });
        Cast.belongsTo(models.CastInfo, { foreignKey: 'castId', as: 'person' });

    }
  }
  Cast.init({
    movie_id: DataTypes.INTEGER,
    castId: DataTypes.INTEGER,
    character: DataTypes.STRING,
    creditId: DataTypes.STRING,
    profilePath: DataTypes.STRING,
    name: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Cast',
  });
  return Cast;
};