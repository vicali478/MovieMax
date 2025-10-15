"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Series", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      f_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      posterUrl: Sequelize.STRING,
      firstAirDate: Sequelize.DATE,
      voteAverage: Sequelize.FLOAT,
      runtime: Sequelize.INTEGER,
      genres: Sequelize.JSON,
      type: Sequelize.STRING,
      year: Sequelize.INTEGER,
      tmdbId: Sequelize.INTEGER,
      imdbId: Sequelize.STRING,
      titleLong: Sequelize.STRING,
      homepage: Sequelize.STRING,
      slug: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      synopsis: Sequelize.TEXT('long'),
      mpaRating: Sequelize.STRING,
      productionCompanies: Sequelize.JSON,
      productionCountries: Sequelize.JSON,
      spokenLanguages: Sequelize.JSON,
      backdropUrl: Sequelize.STRING,
      voteCount: Sequelize.INTEGER,
      popularity: Sequelize.FLOAT,
      published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      next_update: Sequelize.DATE,
      tagline: Sequelize.STRING,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Series");
  },
};
