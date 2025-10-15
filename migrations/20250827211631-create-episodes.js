"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Episodes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      seasonId: {
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
      episodeNumber: {
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
      stillUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      airDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      runtime: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      seasonNumber: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      showTMDBId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      videoUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sourceUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      auxillarySourceUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      downloadUrl: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("Episodes");
  },
};
