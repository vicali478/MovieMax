'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Crew extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Crew.belongsTo(models.Movie, { foreignKey: 'movie_id', as: 'movie' });
      Crew.belongsTo(models.CastInfo, { foreignKey: 'castId', as: 'person' });
    }
  }
  Crew.init({
    movie_id: DataTypes.INTEGER,
    castId: DataTypes.INTEGER,
    department: DataTypes.STRING,
    creditId: DataTypes.STRING,
    profilePath: DataTypes.STRING,
    name: DataTypes.STRING,
    job: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Crew',
  });
  return Crew;
};