'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Movie extends Model {
        static associate(models) {
            Movie.hasMany(models.Cast, { foreignKey: 'movie_id', as: 'casts' });
            Movie.hasMany(models.Crew, { foreignKey: 'movie_id', as: 'crews' });
            Movie.hasMany(models.Trailer, { foreignKey: 'movie_id', as: 'trailers' });
            Movie.belongsToMany(models.Movie, {
                through: 'RecommendedMovies',
                as: 'recommendations', // movies recommended by this movie
                foreignKey: 'movie_id',
                otherKey: 'recommended_id',
                onDelete: 'CASCADE',
                hooks: true, // required for onDelete to trigger
            });

            // Optional reverse relation (movies that recommend this one)
            Movie.belongsToMany(models.Movie, {
                through: 'RecommendedMovies',
                as: 'recommendedBy',
                foreignKey: 'recommended_id',
                otherKey: 'movie_id',
                hooks: true,
                onDelete: 'CASCADE',
            });
        }
    }

    Movie.init(
        {
            f_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            posterUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            releaseDate: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            voteAverage: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
            runtime: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            genres: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            type: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            year: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            tmdbId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            imdbId: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            titleLong: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            homepage: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            slug: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            synopsis: {
                type: DataTypes.TEXT('long'),
                allowNull: true,
            },
            mpaRating: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            productionCompanies: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            productionCountries: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            spokenLanguages: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            backdropUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            voteCount: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            popularity: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
            published: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            downloadUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            videoUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            go_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            next_update: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            tagline: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            watchProviders: {
                type: DataTypes.JSON,
                allowNull: true,
            },

        },
        {
            sequelize,
            modelName: 'Movie',
        }
    );

    return Movie;
};
