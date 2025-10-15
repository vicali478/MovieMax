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


// Helpers
const formatDateForMySQL = (date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');

// Update movie base info
async function updateMovie(data) {
  try {
    const movie = await Movie.findByPk(data.id);
    if (!movie) return;

    if (data.releaseDate)
      await movie.update({
        f_id: data.f_id,
        title: data.title || 'Untitled',
        posterUrl: data.posterUrl || null,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
        voteAverage: data.voteAverage || null,
        runtime: data.runtime || null,
        genres: JSON.stringify(data.genres || []),
        type: data.type || 'movie',
        year: data.releaseDate ? new Date(data.releaseDate).getFullYear() : null,
        tmdbId: data.tmdbId || null,
        imdbId: data.imdbId || null,
        titleLong: data.titleLong || null,
        homepage: data.homepage || null,
        slug: data.slug || null,
        synopsis: data.synopsis || null,
        mpaRating: data.mpaRating || null,
        productionCompanies: JSON.stringify(data.productionCompanies || []),
        productionCountries: JSON.stringify(data.productionCountries || []),
        spokenLanguages: JSON.stringify(data.spokenLanguages || []),
        backdropUrl: data.backdropUrl || null,
        voteCount: data.voteCount || null,
        popularity: data.popularity || null,
        published: data.published || null,
        downloadUrl: data.downloadUrl || null,
        videoUrl: data.videoUrl || null,
        watchProviders: JSON.stringify(data.watchProviders),
        next_update: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next update in 30 days
      });
  } catch (error) {
    console.error("❌ Failed to update movie:", error.message);
  }
}


async function updateTv(data) {
  try {
    const tv = await Series.findByPk(data.id);
    if (!tv) return;

    if (data.firstAirDate)
      await tv.update({
        f_id: data.f_id,
        title: data.title || 'Untitled',
        posterUrl: data.posterUrl || null,
        firstAirDate: data.firstAirDate ? new Date(data.firstAirDate) : null,
        voteAverage: data.voteAverage || null,
        genres: JSON.stringify(data.genres || []),
        type: data.type || 'tv',
        year: data.firstAirDate ? new Date(data.firstAirDate).getFullYear() : null,
        tmdbId: data.tmdbId || null,
        imdbId: data.imdbId || null,
        titleLong: data.titleLong || null,
        homepage: data.homepage || null,
        slug: data.slug || null,
        synopsis: data.synopsis || null,
        mpaRating: data.mpaRating || null,
        productionCompanies: JSON.stringify(data.productionCompanies || []),
        productionCountries: JSON.stringify(data.productionCountries || []),
        spokenLanguages: JSON.stringify(data.spokenLanguages || []),
        backdropUrl: data.backdropUrl || null,
        voteCount: data.voteCount || null,
        popularity: data.popularity || null,
        published: data.published || null,
        watchProviders: JSON.stringify(data.watchProviders),
        next_update: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next update in 30 days
      });
  } catch (error) {
    console.error("❌ Failed to update movie:", error.message);
  }
}

// Save full details (cast, crew, trailers)
async function saveDetails(result) {
  try {
    if (!result || !result.id) {
      console.error("❌ Invalid movie data: missing result.id");
      return false;
    }

    // ✅ Update main movie details
    await updateMovie(result);

    await Promise.all([
      Cast.destroy({ where: { movie_id: result.id } }),
      Crew.destroy({ where: { movie_id: result.id } }),
      Trailer.destroy({ where: { movie_id: result.id } }),
    ]);
    // Bulk insert in parallel 
    await Promise.all([Cast.bulkCreate(result.casts),
    Crew.bulkCreate(result.crew),
    Trailer.bulkCreate(result.videos),]);

    // ✅ Handle recommended movies
    if (Array.isArray(result.recommendations) && result.recommendations.length > 0) {
      await Promise.all(
        result.recommendations.map(async (rec) => {
          try {
            if (!rec.f_id) return; // Skip invalid entries

            // Proper slug handling
            const title = rec.title || "Untitled";
            const slug =
              rec.slug ||
              title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            // Create or find the recommended movie
            const [movie] = await Movie.findOrCreate({
              where: { f_id: rec.f_id },
              defaults: {
                f_id: rec.f_id,
                title,
                slug,
                genres: JSON.stringify(rec.genres || []),
                posterUrl: rec.posterUrl || null,
                backdropUrl: rec.backdropUrl || null,
                year:
                  rec.year ||
                  (rec.releaseDate
                    ? new Date(rec.releaseDate).getFullYear()
                    : null),
                releaseDate: rec.releaseDate || null,
                type: rec.type || "movie",
                voteAverage: rec.voteAverage || null,
              },
            });

            // Link the recommended movie
            await RecommendedMovie.findOrCreate({
              where: {
                movie_id: result.id,
                recommended_id: movie.id,
              },
            });
          } catch (err) {
            console.error(
              `❌ Error inserting recommended movie (f_id: ${rec.f_id}):`,
              err.message
            );
          }
        })
      );
    }

    console.log(`✅ Successfully saved details for movie ID: ${result.id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed during saveDetails:", error.message);
    return false;
  }
}

async function saveTv(result) {
  try {
    if (!result || !result.id) {
      console.error("❌ Invalid movie data: missing result.id");
      return false;
    }

    // ✅ Update main tv details
    await updateTv(result);

    await Promise.all([
      SeriesCast.destroy({ where: { seriesId: result.id } }),
      SeriesCrew.destroy({ where: { seriesId: result.id } }),
      SeriesTrailer.destroy({ where: { seriesId: result.id } }),
      Season.destroy({ where: { seriesId: result.id } }),
    ]);
    // Bulk insert in parallel 
    await Promise.all([SeriesCast.bulkCreate(result.casts),
    SeriesCrew.bulkCreate(result.crew),
    SeriesTrailer.bulkCreate(result.videos),]);


    // Insert seasons and episodes
    if (Array.isArray(result.seasons) && result.seasons.length > 0) {
      await Promise.all(
        result.seasons.map(async (s) => {
          try {
            // Create the season
            const season = await Season.create(s); // ✅ Sequelize uses .create(), not .Create()

            // Attach the seasonId to each episode
            const episodes = (s.episodes || []).map((e) => ({
              ...e,
              seasonId: season.id,
            }));

            // Only bulk create if there are episodes
            if (episodes.length > 0) {
              await Episode.bulkCreate(episodes);
            }
          } catch (err) {
            console.error(
              `❌ Error inserting season (name: ${s.name || 'unknown'}):`,
              err.message
            );
          }
        })
      );
    }

    // ✅ Handle recommended movies
    if (Array.isArray(result.recommendations) && result.recommendations.length > 0) {
      await Promise.all(
        result.recommendations.map(async (rec) => {
          try {
            if (!rec.f_id) return; // Skip invalid entries

            // Proper slug handling
            const title = rec.title || "Untitled";
            const slug =
              rec.slug ||
              title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            // Create or find the recommended movie
            const [series] = await Series.findOrCreate({
              where: { f_id: rec.f_id },
              defaults: {
                f_id: rec.f_id,
                title,
                slug,
                genres: JSON.stringify(rec.genres || []),
                posterUrl: rec.posterUrl || null,
                backdropUrl: rec.backdropUrl || null,
                year:
                  rec.year ||
                  (rec.firstAirDate
                    ? new Date(rec.firstAirDate).getFullYear()
                    : null),
                firstAirDate: rec.firstAirDate || null,
                type: rec.type || "movie",
                voteAverage: rec.voteAverage || null,
              },
            });

            // Link the recommended movie
            await RecommendedSeries.findOrCreate({
              where: {
                seriesId: result.id,
                recommended_id: series.id,
              },
            });
          } catch (err) {
            console.error(
              `❌ Error inserting recommended movie (f_id: ${rec.f_id}):`,
              err.message
            );
          }
        })
      );
    }

    console.log(`✅ Successfully saved details for movie ID: ${result.id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed during saveDetails:", error.message);
    return false;
  }
}


exports.getMovieDetails = async (req, res) => {

  const movieId = req.id;
  try {

    // Step 5: Refetch full movie with associations
    const movie = await Movie.findByPk(movieId);

    if (!movie) return res.status(404).json({ message: 'Movie not found' });

    const url = `https://www.films365.org/movie/${movie.f_id}`;

    const fullInfo = await filterMovieAttributes(url, movie.id);

    if (fullInfo) {
      res.json(fullInfo);

      await saveDetails(fullInfo);
      return;
    }
    // ✅ Convert Sequelize model to plain JSON before sending
    res.json({
      ...movie.toJSON()
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

  const tvId = req.id;
  try {

    // Step 5: Refetch full tv with associations
    const tv = await Series.findByPk(tvId, {
    });

    if (!tv) return res.status(404).json({ message: 'Tv not found' });

    const url = `https://www.films365.org/tv/${tv.f_id}?season=1&episode=1`;

    const fullInfo = await filterTvAttributes(url, tv.id);

    if (fullInfo) {
      res.json(fullInfo);
      await saveTv(fullInfo);
      return;
    }

    // ✅ Convert Sequelize model to plain JSON before sending
    res.json({
      ...tv.toJSON()
    });
  } catch (error) {
    console.error('❌ Error in gettvDetails:', error.message);
    res.status(500).json({
      message: 'Failed to fetch or save tv details',
      error: error.message,
    });
  }
};
