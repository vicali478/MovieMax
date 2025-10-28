"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Seasons", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      seriesId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        onDelete: "CASCADE",
      },
      f_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      tmdbId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      seasonNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
      },
      synopsis: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      posterUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      airDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      numberOfEpisodes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      voteAverage: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Seasons");
  },
};
