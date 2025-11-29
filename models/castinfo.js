'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CastInfo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
  CastInfo.hasMany(models.Cast, { foreignKey: 'castId', as: 'movie_casts' });
  CastInfo.hasMany(models.Crew, { foreignKey: 'castId', as: 'movie_crews' });

    }
  }
  CastInfo.init({
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
    gender: DataTypes.INTEGER,
    known_for_department: DataTypes.STRING,
    name: DataTypes.STRING,
    original_name: DataTypes.STRING,
    popularity: DataTypes.STRING,
    profile_path: DataTypes.STRING,
    known_for: DataTypes.JSON,
    also_known_as: DataTypes.JSON,
    biography: DataTypes.TEXT('long'),
    birthday: DataTypes.DATE,
    deathday: DataTypes.DATE,
    imdb_id: DataTypes.STRING,
    place_of_birth: DataTypes.STRING,
    popular: DataTypes.STRING,
    adult: DataTypes.BOOLEAN,
    homepage: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'CastInfo',
  });
  return CastInfo;
};