const axios = require('axios');
const { Movie, Series, Cast, Crew, Trailer, RecommendedMovie, RecommendedSeries, SeriesTrailer, SeriesCrew, SeriesCast, Season, Episode } = require('./models');
const fs = require('fs');
const path = require('path');
const { Op, fn, col, literal, Sequelize, JSON } = require('sequelize');

const { getDetails } = require('./details');
const { console } = require('inspector');


const MAX_RETRIES = 3;

async function fetchInfo(movieId, attempt = 1) {
  try {
    const details = await getDetails(movieId);
    return details ?? null;
  } catch (err) {
    if (attempt < MAX_RETRIES) return fetchInfo(movieId, attempt + 1);
    return null;
  }
}


async function fetchWatchProviders(results) {

  if (!results || typeof results !== "object") {
    return [];
  }

  // Use a Set to avoid duplicate provider IDs
  const seen = new Set();
  const uniqueProviders = [];

  for (const countryCode in results) {
    const info = results[countryCode];

    // Loop over all provider types dynamically
    for (const typeKey of Object.keys(info)) {
      const providers = info[typeKey];

      if (Array.isArray(providers)) {
        for (const provider of providers) {
          const { provider_id, provider_name, logo_path } = provider;

          if (!seen.has(provider_id)) {
            seen.add(provider_id);
            uniqueProviders.push({
              provider_id,
              provider_name,
              type: typeKey, // save which type: flatrate, rent, buy
              logo: `https://image.tmdb.org/t/p/w500${logo_path}`,
            });
          }
        }
      }
    }
  }

  return uniqueProviders;
}

async function filterMovieAttributes(url, id) {

  let movie = await fetchInfo(url);

  if (movie === null) {
    console.error(`❌ Failed to fetch movie details for URL: ${url}`);
    return null;
  }

  const providers = await fetchWatchProviders(movie.watchProviders.results);

  movie.watchProviders = providers;


  delete movie.createdAt;
  delete movie.updatedAt;
  delete movie._count;
  delete movie.favorite;
  delete movie.lastAiredEpisode;
  delete movie.clicksCount;
  delete movie.published;

  movie.f_id = movie.id; // keep original f_id
  movie.id = id; // use local db id

  movie.videos = (movie.videos || []).map(v => ({
    movie_id: id,
    name: v.name,
    key: v.key,
    site: v.site,
  }));

  movie.casts = (movie.casts || []).map(cast => ({
    movie_id: id,
    castId: cast.id,
    character: cast.character,
    creditId: cast.creditId,
    profilePath: cast.profileUrl,
    name: cast.name,
    order: cast.order,
  }));

  movie.crew = (movie.crew || []).map(crew => ({
    movie_id: id,
    castId: crew.id,
    department: 'crew',
    creditId: crew.creditId,
    profilePath: crew.profileUrl,
    name: crew.name,
    job: crew.job,
    order: crew.order,
  }));

  movie.recommendations = movie.recommendations.map(movie => ({
    f_id: movie.id,
    title: movie.title,
    slug: movie.slug,
    genres: movie.genres,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
    releaseDate: movie.releaseDate,
    runtime: movie.runtime,
    type: movie.type || 'movie',
    voteAverage: movie.voteAverage,
    tmdbId: movie.tmdbId || null,
    voteCount: movie.voteCount || null
  }));

  movie.type = 'movie';

  return movie;

}

async function filterTvAttributes(url, id) {

  let tv = await fetchInfo(url);

  if (tv === null) {
    console.error(`❌ Failed to fetch tv details for URL: ${url}`);
    return null;
  }

  const providers = await fetchWatchProviders(tv.watchProviders.results);

  tv.watchProviders = providers;
  delete tv.createdAt;
  delete tv.updatedAt;
  delete tv._count;
  delete tv.favorite;
  delete tv.lastAiredEpisode;


  tv.f_id = tv.id; // keep original f_id
  tv.id = id; // use local db id
  tv.seasons = tv.seasons.map(season => {
    season.f_id = season.id;
    season.seriesId = id;
    delete season.id;
    delete season.createdAt;
    delete season.updatedAt;
    season.episodes = season.episodes.map(episode => {
      episode.f_id = episode.id;
      delete episode.id;
      delete episode.createdAt;
      delete episode.updatedAt;
      delete episode.videoDownloadStatus;
      delete episode.videoDownloadTrialCount;
      delete episode.downloads;
      delete episode.views;
      delete episode.published;
      return episode;
    });
    return season;
  });

  tv.videos = (tv.videos || []).map(v => ({
    seriesId: id,
    name: v.name,
    key: v.key,
    site: v.site,
  }));

  tv.casts = (tv.casts || []).map(cast => ({
    seriesId: id,
    castId: cast.id,
    character: cast.character,
    creditId: cast.creditId,
    profilePath: cast.profileUrl,
    name: cast.name,
    order: cast.order,
  }));

  tv.crew = (tv.crew || []).map(crew => ({
    seriesId: id,
    castId: crew.id,
    department: 'crew',
    creditId: crew.creditId,
    profilePath: crew.profileUrl,
    name: crew.name,
    job: crew.job,
    order: crew.order,
  }));

  tv.recommendations = tv.recommendations.map(rec => ({
    f_id: rec.id,
    title: rec.title,
    slug: rec.slug,
    genres: rec.genres,
    posterUrl: rec.posterUrl,
    backdropUrl: rec.backdropUrl,
    year: rec.releaseDate ? new Date(rec.firstAirDate).getFullYear() : null,
    firstAirDate: rec.firstAirDate,
    runtime: rec.runtime,
    type: rec.type || 'tv',
    voteAverage: rec.voteAverage
  }));

  tv.type = 'tv';
  return tv;

}


exports.getMovieDetails = async (req, res) => {

  try {

    const { id, f_id } = req;

    const url = `https://www.films365.org/movie/${f_id}`;

    const fullInfo = await filterMovieAttributes(url, id);

    if (fullInfo) {
      res.json(fullInfo);

      await saveDetails(fullInfo);
      return;
    }
    // ✅ Convert Sequelize model to plain JSON before sending
    res.json({
      ...fullInfo
    });
  } catch (error) {
    console.error('❌ Error in getMovieDetails:', error.message);
    res.status(500).json({
      message: 'Failed to fetch or save movie details',
      error: error.message,
    });
  }
};

exports.getTvDetails = async (req, res) => {

  try {

   const { id, f_id } = req;

    const url = `https://www.films365.org/tv/${f_id}?season=1&episode=1`;

    const fullInfo = await filterTvAttributes(url, id);


    // ✅ Convert Sequelize model to plain JSON before sending
    res.json({
      ...fullInfo
    });
  } catch (error) {
    console.error('❌ Error in gettvDetails:', error.message);
    res.status(500).json({
      message: 'Failed to fetch or save tv details',
      error: error.message,
    });
  }
};
