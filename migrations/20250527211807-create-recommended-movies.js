'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RecommendedMovies', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      movie_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Movies', key: 'id' },
        onDelete: 'CASCADE',
      },
      recommended_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Movies', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RecommendedMovies');
  },
};
