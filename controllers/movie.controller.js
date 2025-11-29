const { Movie, Cast, Crew, Trailer } = require('../models');

const fs = require('fs');
const path = require('path');
const { where } = require('sequelize');
const { Op, fn, col, literal, Sequelize } = require('sequelize');
const fetchTrending = require('../tmds').fetchAll;
const filePath = path.resolve(__dirname, "../categorized-movies.json");
const axios = require('axios');
require('dotenv').config();
const db = require('../firebase/firebase');

const { generateMovieUrl } = require("../helpers/tokenHelper");

const API_KEY = process.env.MY_TMDB_API_KEY_2; // Your TMDb API key
const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, '../genres.json'))).genres;
// Read and parse the JSON
const movieCategories = JSON.parse(fs.readFileSync(filePath, "utf-8"))

// Get all movies with related data
exports.getAllMovies = async (req, res) => {
  try {
    let movies = await Movie.findAll({
      include: [
        { model: Cast, as: 'casts' },
        { model: Crew, as: 'crews' },
        { model: Trailer, as: 'trailers' }
      ]
    });
    movies = movies.filter(m => m.posterUrl !== null);
    movies = movies.map(movie => {
      try {
        if (typeof movie.genres === "string") {
          movie.genres = JSON.parse(movie.genres);
        }
      } catch (err) {
        console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
        movie.genres = []; // fallback if parsing fails
      }
      return movie;
    });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movies', error });
  }
};

// Get a single movie by ID with related data
exports.getMovieById = async (req, res, next) => {
  try {

    // Fetch movie with all relations in a single optimized call
    let movie = await Movie.findByPk(req.params.id, {
      include: [
        {
          association: 'casts',
          separate: true, // runs a separate query for performance
          order: [['order', 'ASC']] // optional, if you have an 'order' field
        },
        {
          association: 'crews',
          separate: true
        },
        {
          association: 'trailers',
          separate: true,
        },
        {
          association: 'recommendations',
          attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],

        }
      ]
    });

    // Movie not found
    if (!movie) {

      // movie = await getAllMovieDetails(req.params.id);
      if (!movie) {
        return res.status(404).json({ message: 'Movie not found' });
      }
      return res.json(movie);

    }

    const movieId = movie.id;

    // If IMDb ID missing, trigger next middleware to fetch from TMDB/OMDb
    if (!movie.downloadUrl) {
      req.exist = true;
      req.id = movieId; // Set for downstream handler
      return next();
    }

    // ✅ Convert Sequelize instance to plain editable JSON
    if (movie) {
      movie = movie.toJSON();
    }

    movie.genres = JSON.parse(movie.genres || '[]');
    movie.productionCompanies = JSON.parse(movie.productionCompanies || '[]');
    movie.productionCountries = JSON.parse(movie.productionCountries || '[]');
    movie.spokenLanguages = JSON.parse(movie.spokenLanguages || '[]');
    movie.watchProviders = JSON.parse(movie.watchProviders || '[]');

    // Clean up unwanted fields

    delete movie.published;
    delete movie.createdAt;
    delete movie.updatedAt;
    delete movie.go_id;
    delete movie.poster_path;
    delete movie.imdbRating;
    delete movie.numRatings;
    delete movie.published;

    // Generate URLs concurrently
    const [downloadUrl, videoUrl] = await Promise.all([
      generateMovieUrl(movie.f_id, movie.title, 'movie', 'download', req.apiKey),
      generateMovieUrl(movie.f_id, movie.title, 'movie', 'watch',req.apiKey, movie.runtime)
    ]);

    movie.downloadUrl = downloadUrl;
    movie.videoUrl = videoUrl;
    delete movie.f_id;

    //clean up unwanted fields from casts
    if (movie.casts && Array.isArray(movie.casts)) {
      movie.casts = movie.casts.map(cast => {
        delete cast.id;
        delete cast.createdAt;
        delete cast.updatedAt;
        delete cast.movie_id;
        return cast;
      });
    }

    //clean up unwanted fields from crews
    if (movie.crews && Array.isArray(movie.crews)) {
      movie.crew = movie.crews.map(crew => {
        delete crew.id;
        delete crew.createdAt;
        delete crew.updatedAt;
        delete crew.movie_id;
        return crew;
      });
    }

    //clean up unwanted fields from trailers
    if (movie.trailers && Array.isArray(movie.trailers)) {
      movie.videos = movie.trailers.map(trailer => {
        delete trailer.id;
        delete trailer.createdAt;
        delete trailer.updatedAt;
        delete trailer.movie_id;
        return trailer;
      });
    }

    delete movie.trailers;
    delete movie.crews;
    // Clean up unwanted fields from recommendations
    if (movie.recommendations && Array.isArray(movie.recommendations)) {
      movie.recommendations = movie.recommendations.map(rec => {

        try {
          if (typeof rec.genres === "string") {
            rec.genres = JSON.parse(rec.genres);
          }
        } catch (err) {
          console.error(`⚠️ Failed to parse genres for movie ID ${rec.id}:`, err.message);
          rec.genres = []; // fallback if parsing fails
        }
        delete rec.f_id;
        delete rec.createdAt;
        delete rec.updatedAt;
        delete rec.movie_id;
        delete rec.RecommendedMovies; // junction table data
        return rec;
      });
    }

    movie.type = 'movie';

    // ✅ Convert Sequelize model to plain JSON before sending
    res.json(movie);
  } catch (error) {
    console.error('❌ Error fetching movie:', error.message);
    res.status(500).json({ message: 'Error fetching movie', error: error.message });
  }
};



const getMovieDetails = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];


  let movies = await Movie.findAll({
    where: {
      f_id: {
        [Op.not]: null,  // f_id IS NOT NULL
      },
      tmdbId: {
        [Op.in]: ids,    // tmdbId IN (array)
      },
    },
    attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
  });

  movies = movies.filter(m => m.posterUrl !== null);

  movies = movies.map(movie => {
    try {
      if (typeof movie.genres === "string") {
        movie.genres = JSON.parse(movie.genres);
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
      movie.genres = []; // fallback if parsing fails
    }
    return movie;
  });


  return movies;
};

const getPopularMovieDetails = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];


  let movies = await Movie.findAll({
    where: {
      f_id: {
        [Op.in]: ids,    // tmdbId IN (array)
      },
    },
    attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
  });

  movies = movies.filter(m => m.posterUrl !== null);

  movies = movies.map(movie => {
    try {
      if (typeof movie.genres === "string") {
        movie.genres = JSON.parse(movie.genres);
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
      movie.genres = []; // fallback if parsing fails
    }
    return movie;
  });


  return movies;
};


exports.getTrendingMovies = async (req, res) => {
  try {
    // Fetch 16 movies from each category
    const trendingToday = await getMovieDetails(movieCategories['trendingToday'].slice(0, 15));
    const trendingWeek = await getMovieDetails(movieCategories['trendingWeek'].slice(0, 15));
    const topRated = await getMovieDetails(movieCategories['topRated'].slice(0, 15));
    const nowPlaying = await getMovieDetails(movieCategories['nowPlaying'].slice(0, 15));

    const data = [
      {
        type: 'featured',
        buttonText: 'VIEW MOVIE',
        data: trendingToday[0] // Use first item for featured
      },
      {
        type: 'movieList',
        title: 'TRENDING TODAY',
        category: 'trendingToday',
        movies: trendingToday
      },
      {
        type: 'featured',
        buttonText: 'VIEW MOVIE',
        data: trendingWeek[0]
      },
      {
        type: 'movieList',
        title: 'TRENDING THIS WEEK',
        category: 'trendingWeek',
        movies: trendingWeek
      },
      {
        type: 'featured',
        buttonText: 'VIEW MOVIE',
        data: topRated[0]
      },
      {
        type: 'movieList',
        title: 'TOP RATED',
        category: 'topRated',
        movies: topRated
      },
      {
        type: 'featured',
        buttonText: 'VIEW MOVIE',
        data: nowPlaying[0]
      },
      {
        type: 'movieList',
        title: 'NOW PLAYING',
        category: 'nowPlaying',
        movies: nowPlaying
      }
    ];

    res.json(data);

    await fetchTrending(); // calling the fetchAll function
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch trending movies.' });
  }
};


exports.groupByYear = async (req, res, next) => {
  const yearData = [];
  const currentYear = new Date().getFullYear();

  try {
    for (let year = currentYear; year >= 2005; year--) {
      let movies = await Movie.findAll({
        where: literal(`YEAR(releaseDate) = ${year}`),
        attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
        order: [['popularity', 'DESC']],
        limit: 15
      });

      movies = movies.filter(m => m.posterUrl !== null);
      movies = movies.map(movie => {
        try {
          if (typeof movie.genres === "string") {
            movie.genres = JSON.parse(movie.genres);
          }
        } catch (err) {
          console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
          movie.genres = []; // fallback if parsing fails
        }
        return movie;
      });
      yearData.push({
        year,
        movies
      });
    }

    res.json({
      success: true,
      data: yearData
    });

  } catch (error) {
    console.error('❌ Error in groupByYear:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group movies by year',
      error: error.message
    });
  }
};

exports.groupByGenre = async (req, res, next) => {
  const genreData = [];

  try {
    for (const genre of GENRES) {
      let movies = await Movie.findAll({
        where: {
          [Op.and]: [
            where(fn('LOWER', col('genres')), {
              [Op.like]: `%${genre.name.toLowerCase()}%`
            })
          ]
        },
        attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
        order: [['popularity', 'DESC']],
        limit: 15
      });

      console.log(`Fetched ${movies.length} movies for genre: ${genre.name}`);

      movies = movies.filter(m => m.posterUrl !== null);
      movies = movies.map(movie => {
        try {
          if (typeof movie.genres === "string") {
            movie.genres = JSON.parse(movie.genres);
          }
        } catch (err) {
          console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
          movie.genres = []; // fallback if parsing fails
        }
        return movie;
      });
      genreData.push({
        genre: genre.name,
        genre_id: genre.id,
        movies
      });
    }

    res.json({
      success: true,
      data: genreData
    });

  } catch (error) {
    console.error('❌ Error in groupByGenre:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group movies by genre',
      error: error.message
    });
  }
};


exports.getMoviesAZ = async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    let { count, rows: movies } = await Movie.findAndCountAll({
      attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
      order: [['title', 'ASC']],
      limit,
      offset
    });

    movies = movies.filter(m => m.posterUrl !== null);
    movies = movies.map(movie => {
      try {
        if (typeof movie.genres === "string") {
          movie.genres = JSON.parse(movie.genres);
        }
      } catch (err) {
        console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
        movie.genres = []; // fallback if parsing fails
      }
      return movie;
    });
    res.json({
      success: true,
      page,
      totalPages: Math.ceil(count / limit),
      totalResults: count,
      movies
    });
  } catch (error) {
    console.error("❌ Error fetching A–Z movies:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movies sorted A–Z",
      error: error.message
    });
  }
};


exports.getPopularMovies = async (req, res, next) => {
  const page = parseInt(req.params.page, 10) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  let { count, rows: movies } = await Movie.findAndCountAll({
    where: {
      // Add filters here if needed
    },
    attributes: [
      'id',
      'title',
      'slug',
      'genres',
      'posterUrl',
      'backdropUrl',
      'synopsis',
      'releaseDate',
      'runtime',
      'type',
      'mpaRating',
      'voteAverage',
      'voteCount',

      'tmdbId',
      'popularity'
    ],
    order: [['popularity', 'DESC']], // ✅ sort by popularity descending
    limit,
    offset
  });


  const totalPages = Math.ceil(count / limit);
  movies = movies.filter(m => m.posterUrl !== null);
  movies = movies.map(movie => {
    try {
      if (typeof movie.genres === "string") {
        movie.genres = JSON.parse(movie.genres);
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
      movie.genres = []; // fallback if parsing fails
    }
    return movie;
  });

  res.json({ category: 'popular', page, totalPages, movies });

};

async function paginateArray(data, page = 1, perPage = 30) {
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    page,
    totalPages: Math.ceil(data.length / perPage),
    items: data.slice(start, end),
  };
}

exports.getCategory = async (req, res) => {
  const { category, page = 1 } = req.params;
  const ids = movieCategories[category];

  if (!ids) return res.status(404).json({ error: 'Category not found' });

  const { items, totalPages } = await paginateArray(ids, page);
  const detailed = await getMovieDetails(items);

  res.json({ category, page: parseInt(page), totalPages, movies: detailed });
}
const CHUNK_SIZE = 500; // safe batch size for bulkCreate

async function saveMovies(movies) {
  try {
    const formattedMovies = movies.map(movie => ({
      ...movie,
      genres: movie.genre_ids || [],
    }));

    for (let i = 0; i < formattedMovies.length; i += CHUNK_SIZE) {
      const chunk = formattedMovies.slice(i, i + CHUNK_SIZE);

      await Movie.bulkCreate(chunk, {
        ignoreDuplicates: true, // only works if `id` is unique in DB
      });

      console.log(`✅ Saved ${chunk.length} movies (batch ${i / CHUNK_SIZE + 1})`);
    }

  } catch (error) {
    console.error("❌ Failed during bulk movie insert:", error.message);
  }
}
async function getMoviesByYear(year, page) {
  const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
    params: {
      api_key: API_KEY,
      sort_by: 'popularity.desc',
      primary_release_year: year,
      page
    }
  });

  let movies = response.data.results;

  movies = movies.filter(m => m.poster_path !== null);
  // Save all movies to the database
  await saveMovies(movies);
  return movies;
};

async function getMoviesByGenre(genreId, page) {
  const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
    params: {
      api_key: API_KEY,
      sort_by: 'popularity.desc',
      with_genres: genreId,
      page
    }
  });

  let movies = response.data.results;

  movies = movies.filter(m => m.poster_path !== null);
  // Save all movies to the database
  await saveMovies(movies);
  return movies;
};

exports.getYear = async (req, res) => {
  const year = req.params.year;
  const limit = 20;
  const page = parseInt(req.params.page, 10) || 1;
  const offset = (page - 1) * limit;

  let { count, rows: movies } = await Movie.findAndCountAll({
    where: literal(`YEAR(releaseDate) = ${year}`),
    attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
    order: [['popularity', 'DESC']],
    limit,
    offset
  });

  if (!movies.length) {
    movies = await getMoviesByYear(year, page);
  };

  movies = movies.filter(m => m.posterUrl !== null);
  movies = movies.map(movie => {
    try {
      if (typeof movie.genres === "string") {
        movie.genres = JSON.parse(movie.genres);
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
      movie.genres = []; // fallback if parsing fails
    }
    return movie;
  });
  res.json({
    success: true,
    page,
    totalPages: Math.ceil(count / limit),
    totalResults: count,
    movies: movies
  });
}

exports.getGenre = async (req, res) => {

  const genre = req.query.genre;
  const limit = 20;
  const page = parseInt(req.params.page, 10) || 1;
  const offset = (page - 1) * limit;
  if (!genre) return res.status(404).json({ error: 'Genre not found' });
  let { count, rows: movies } = await Movie.findAndCountAll({
    where: {
      [Op.and]: [
        where(fn('LOWER', col('genres')), {
          [Op.like]: `%${genre.toLowerCase()}%`
        })
      ]
    },
    attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
    order: [['popularity', 'DESC']],
    limit,
    offset
  });

  if (!movies.length) {
    movies = await getMoviesByGenre(genre.id, page);
  };

  movies = movies.filter(m => m.posterUrl !== null);
  movies = movies.map(movie => {
    try {
      if (typeof movie.genres === "string") {
        movie.genres = JSON.parse(movie.genres);
      }
    } catch (err) {
      console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
      movie.genres = []; // fallback if parsing fails
    }
    return movie;
  });
  res.json({
    success: true,
    page,
    totalPages: Math.ceil(count / limit),
    totalResults: count,
    movies: movies
  });
}


async function searchMoviesFromTMDb(query, page) {
  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: API_KEY,
        query: query,
        page: page,
        include_adult: false
      }
    });

    return response.data.results;
  } catch (error) {
    console.error('❌ TMDb search error:', error.message);
    return [];
  }
}


exports.getLatestMovies = async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;

    const today = new Date();

    let { count, rows: movies } = await Movie.findAndCountAll({
      where: {
        releaseDate: {
          [Op.and]: [
            { [Op.ne]: null }, // Not null
            { [Op.lte]: today } // Less than or equal to today
          ]
        }
      },
      attributes: ['id', 'title', 'slug', 'genres', 'posterUrl', 'backdropUrl', 'synopsis', 'releaseDate', 'runtime', 'type', 'mpaRating', 'voteAverage', 'tmdbId', 'voteCount'],
      order: [['releaseDate', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);
    movies = movies.filter(m => m.posterUrl !== null);
    movies = movies.map(movie => {
      try {
        if (typeof movie.genres === "string") {
          movie.genres = JSON.parse(movie.genres);
        }
      } catch (err) {
        console.error(`⚠️ Failed to parse genres for movie ID ${movie.id}:`, err.message);
        movie.genres = []; // fallback if parsing fails
      }
      return movie;
    });
    res.json({
      success: true,
      page,
      totalPages,
      totalResults: count,
      movies
    });

  } catch (error) {
    console.error('❌ Error fetching latest movies:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest movies',
      error: error.message
    });
  }
};






