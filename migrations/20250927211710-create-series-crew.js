'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SeriesCrews', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      seriesId: {
        type: Sequelize.INTEGER
      },
      castId: {
        type: Sequelize.INTEGER
      },
      department: {
        type: Sequelize.STRING
      },
      creditId: {
        type: Sequelize.STRING
      },
      profilePath: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      job: {
        type: Sequelize.STRING
      },
      order: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('SeriesCrews');
  }
};