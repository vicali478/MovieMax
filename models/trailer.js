'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Trailer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Trailer.belongsTo(models.Movie, { foreignKey: 'movie_id', as: 'movie' });
    }
  }
  Trailer.init({
    movie_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    key: DataTypes.STRING,
    site: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Trailer',
  });
  return Trailer;
};