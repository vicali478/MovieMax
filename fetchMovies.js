const axios = require('axios');
const { Detail } = require("./models");

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const API_KEY = process.env.MY_TMDB_API_KEY_2;
const START_YEAR = 2004;
const END_YEAR = new Date().getFullYear();
const MOVIES_PER_YEAR = 15;
const CHUNK_SIZE = 500; // safe batch size for bulkCreate


let all_movies = [];

async function saveMovies(movies) {
  try {
    const formattedMovies = movies.map(movie => ({
      ...movie,
      genres: movie.genre_ids || [],
    }));

    for (let i = 0; i < formattedMovies.length; i += CHUNK_SIZE) {
      const chunk = formattedMovies.slice(i, i + CHUNK_SIZE);

      await Detail.bulkCreate(chunk, {
        ignoreDuplicates: true, // only works if `id` is unique in DB
      });

      console.log(`✅ Saved ${chunk.length} movies (batch ${i / CHUNK_SIZE + 1})`);
    }

  } catch (error) {
    console.error("❌ Failed during bulk movie insert:", error.message);
  }
}

// Fetch top movies by year
async function fetchMoviesByYear(year) {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params: {
        api_key: API_KEY,
        sort_by: 'popularity.desc',
        primary_release_year: year,
        page: 1
      }
    });

    const movies = res.data.results;
    console.log(`✅ ${year}: ${movies.length} movies fetched`);
    return { year, movies };
  } catch (err) {
    console.error(`❌ Failed to fetch movies for ${year}:`, err.message);
    return { year, movies: [] };
  }
}

// Express controller
exports.getMoviesGroupedByYear = async (req, res) => {
  try {
    const yearRange = Array.from(
      { length: END_YEAR - START_YEAR + 1 },
      (_, i) => START_YEAR + i
    );

    const results = await Promise.all(yearRange.map(fetchMoviesByYear));



    const allYearsData = results.reduce((acc, { year, movies }) => {
      acc[year] = movies;
      return acc;
    }, {});

    // Flatten all movies into a single array
    const allMovies = Object.values(allYearsData).flat();

    // Save all movies to the database
    await saveMovies(allMovies);


    res.json({
      success: true,
      years: allYearsData
    });
  } catch (error) {
    console.error('❌ Error in getMoviesGroupedByYear:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group movies by year',
      error: error.message
    });
  }
};

// TMDb genre list
const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, 'genres.json'))).genres;

async function fetchMoviesByGenre(genreId) {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params: {
        api_key: API_KEY,
        sort_by: 'popularity.desc',
        with_genres: genreId,
        page: 1
      }
    });

    const movies = res.data.results.slice(0, MOVIES_PER_YEAR);
    console.log(`✅ Genre ${genreId}: ${movies.length} movies fetched`);
    return { genreId, movies };
  } catch (err) {
    console.error(`❌ Failed to fetch movies for genre ${genreId}:`, err.message);
    return { genreId, movies: [] };
  }
}

exports.getMoviesGroupedByGenre = async (req, res) => {
  try {
    const results = await Promise.all(GENRES.map(g => fetchMoviesByGenre(g.id)));

    const allGenresData = results.reduce((acc, { genreId, movies }) => {
      const genre = GENRES.find(g => g.id === genreId);
      if (genre) acc[genre.name] = movies;
      return acc;
    }, {});

    // Flatten all movies into a single array
    const allAPI_KEYMovies = Object.values(allGenresData).flat();

    // Save all movies to the database
    await saveMovies(allMovies);

    res.json({
      success: true,
      genres: allGenresData
    });
  } catch (error) {
    console.error('❌ Error in getMoviesGroupedByGenre:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group movies by genre',
      error: error.message
    });
  }
};


/**
 * Fetch movies from TMDb between 2000 and today, sorted A–Z by title
 * GET /tmdb/movies/alpha?page=1
 */
exports.getMoviesAlphaSorted = async (req, res) => {
  
const BASE_URL = 'https://api.themoviedb.org/3/discover/movie';
  const page = req.query.page || 1;
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        language: 'en-US',
        sort_by: 'original_title.asc',
        include_adult: false,
        include_video: false,
        page,
        primary_release_date_gte: '2006-01-01',
        primary_release_date_lte: today
      }
    });

    const movies = response.data.results;

    res.json({
      success: true,
      page: parseInt(page),
      total_results: response.data.total_results,
      total_pages: response.data.total_pages,
      movies
    });
  } catch (error) {
    console.error('❌ TMDb fetch failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch TMDb movies',
      error: error.message
    });
  }
};


