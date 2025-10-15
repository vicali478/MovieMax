'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  async up(queryInterface, Sequelize) {
    const filePath = path.join(__dirname, '..', 'data', 'movies.json');

    // Read and parse JSON data
    const rawData = fs.readFileSync(filePath, 'utf8');
    const movies = JSON.parse(rawData);

    // Prepare records for insertion
    const movieData = movies.map(movie => ({
      ...movie,
      genres: JSON.stringify(movie.genres || []),
      productionCompanies: JSON.stringify(movie.productionCompanies || []),
      productionCountries: JSON.stringify(movie.productionCountries || []),
      spokenLanguages: JSON.stringify(movie.spokenLanguages || []),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await queryInterface.bulkInsert('Movies', movieData);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Movies', null, {});
  },
};
