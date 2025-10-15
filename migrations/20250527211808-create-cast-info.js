'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CastInfos', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      gender: {
        type: Sequelize.INTEGER
      },
      known_for_department: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      original_name: {
        type: Sequelize.STRING
      },
      popularity: {
        type: Sequelize.STRING
      },
      profile_path: {
        type: Sequelize.STRING
      },
      known_for: {
        type: Sequelize.JSON
      },
      also_known_as: {
        type: Sequelize.JSON
      },
      biography: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      birthday: {
        type: Sequelize.DATE
      },
      deathday: {
        type: Sequelize.DATE
      },
      imdb_id: {
        type: Sequelize.STRING
      },
      place_of_birth: {
        type: Sequelize.STRING
      },
      popular: {
        type: Sequelize.STRING
      },
      adult: {
        type: Sequelize.BOOLEAN
      },
      homepage: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CastInfos');
  }
};