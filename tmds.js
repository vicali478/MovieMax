const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { progressDB } = require("./progress");
const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, './genres.json'))).genres;
const { Movie } = require("./models");
const { Op } = require('sequelize');
const slugify = require('slugify');
const fSearch = require('./fSearch');
const e = require("express");
require('dotenv').config();

const { getAllMovieDetails } = require('./fetchAndSave');

const API_KEY = process.env.MY_TMDB_API_KEY_2;
const OUTPUT_FILE = "categorized-movies.json";
const CONCURRENCY_LIMIT = 60;
const CHUNK_SIZE = 100; // safe batch size for bulkCreate

const endpoints = {
  movies: {
    trendingToday: `https://api.themoviedb.org/3/trending/movie/day`,
    trendingWeek: `https://api.themoviedb.org/3/trending/movie/week`,
    topRated: `https://api.themoviedb.org/3/movie/top_rated`,
    nowPlaying: `https://api.themoviedb.org/3/movie/now_playing`,
  }
};

let all_movies = [];


async function saveMovies(movies) {
  try {
    const formattedMovies = movies.map(movie => ({
      ...movie,
      genres: (movie.genre_ids || []).map(gen => GENRES.find((g) => parseInt(g.id) === parseInt(gen)).name),
    }));

    for (let i = 0; i < formattedMovies.length; i += CHUNK_SIZE) {
      const chunk = formattedMovies.slice(i, i + CHUNK_SIZE);

      for (const movie of chunk) {
        try {

          const slug = slugify(movie.title, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });

          // ✅ Prepare data object with only non-null fields
          const data = {
            tmdbId: movie.id,
            title: movie.title || 'Untitled',
            slug,
            genres: movie.genres ? JSON.stringify(movie.genres) : undefined,
            posterUrl: movie.poster_path || undefined,
            releaseDate: movie.release_date || undefined,
            runtime: movie.runtime || undefined,
            type: movie.type || undefined,
            synopsis: movie.overview || undefined,
            backdropUrl: movie.backdrop_path || undefined,
            voteAverage: movie.vote_average || undefined,
          };

          // Remove undefined keys so they don’t overwrite existing DB fields
          Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

          // ✅ Try to find existing movie
          const existingMovie = await Movie.findOne({ where: { tmdbId: movie.id } });

          // 🔍 Helper function to safely search & attach f_id
          const searchAndAttachFid = async () => {
            const searched = await fSearch(movie.title);
            if (searched?.results?.length) {
              const match = searched.results.find(
                (r) => String(r.tmdbId) === String(movie.id)
              );
              if (match) {
                data.f_id = match.id;
                console.log(`✅ Found match for "${movie.title}" → f_id: ${match.id}`);
              } else {

                console.log(`⚠️ No exact match found for "${movie.title}"`);
              }
            } else {
              console.log(`⚠️ No search results for "${movie.title}"`);
            }
          };

          if (existingMovie) {
            // Only fetch f_id if missing
            if (!existingMovie.f_id) await searchAndAttachFid();

            //override movie data with existed data
            if (existingMovie.title) data.title = existingMovie.title;
            if (existingMovie.slug) data.slug = existingMovie.slug;
            if (existingMovie.genres) data.genres = existingMovie.genres;
            if (existingMovie.posterUrl) data.posterUrl = existingMovie.posterUrl;
            if (existingMovie.releaseDate) data.releaseDate = existingMovie.releaseDate;
            if (existingMovie.runtime) data.runtime = existingMovie.runtime;
            if (existingMovie.type) data.type = existingMovie.type;
            if (existingMovie.synopsis) data.synopsis = existingMovie.synopsis;
            if (existingMovie.backdropUrl) data.backdropUrl = existingMovie.backdropUrl;
            if (existingMovie.voteAverage) data.voteAverage = existingMovie.voteAverage;

            // ✅ Update only non-null fields
            await existingMovie.update(data);
            console.log(`✅ Updated: ${movie.title || 'Untitled'}`);
          } else {
            // If new movie → always try searching for f_id
            await searchAndAttachFid();

            if (data.f_id) {
              const existedMovie = await Movie.findOne({ where: { f_id: data.f_id } });

              if (existedMovie) {
                // If f_id already exists, just update the record

                //override movie data with existed data
                if (existedMovie.title) data.title = existedMovie.title;
                if (existedMovie.slug) data.slug = existedMovie.slug;
                if (existedMovie.genres) data.genres = existedMovie.genres;
                if (existedMovie.posterUrl) data.posterUrl = existedMovie.posterUrl;
                if (existedMovie.releaseDate) data.releaseDate = existedMovie.releaseDate;
                if (existedMovie.runtime) data.runtime = existedMovie.runtime;
                if (existedMovie.type) data.type = existedMovie.type;
                if (existedMovie.synopsis) data.synopsis = existedMovie.synopsis;
                if (existedMovie.backdropUrl) data.backdropUrl = existedMovie.backdropUrl;
                if (existedMovie.voteAverage) data.voteAverage = existedMovie.voteAverage;
                await existedMovie.update(data);
                console.log(`♻️ Updated existing by f_id: ${movie.title || 'Untitled'}`);
                continue; // Skip creation
              }


              let movieCreated = await getAllMovieDetails(data.f_id) || {};

              // ✅ Create new movie record
              console.log(`🆕 Created: ${movie.title || 'Untitled'}`);
            }

          }

        } catch (err) {

          console.error(`❌ Error saving ${movie.title || movie.id}:`, movie);
        }
      }


      console.log(`✅ Saved ${chunk.length} movies (batch ${i / CHUNK_SIZE + 1})`);
    }

  } catch (error) {
    console.error("❌ Failed during bulk movie insert:", error.message);
  }
}

async function setNextFetchTime(time) {
  await progressDB.update({}, { $set: { nextFetchTime: time } }, { upsert: true });
}

async function getNextFetchTime() {
  const doc = await progressDB.findOne({});
  return doc ? doc.nextFetchTime : null;
}

async function getStatus() {
  const doc = await progressDB.findOne({});
  return doc ? doc.status : null;
}

async function setStatus(status) {
  await progressDB.updateOne({}, { $set: { status } }, { upsert: true });
}

function loadJSON(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback;
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url, type, category, page, seen, allIDs, progress, key) {
  try {
    const res = await axios.get(`${url}?api_key=${API_KEY}&page=${page}`);
    const results = res.data.results || [];
    if (results.length === 0) return;

    results.sort((a, b) => {
      const dateA = new Date(a.release_date || '1900-01-01');
      const dateB = new Date(b.release_date || '1900-01-01');
      return dateB - dateA;
    });

    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allIDs[category].push(item.id);
        all_movies.push(item);
      }
    }

    progress[key] = page + 1;
    console.log(`✅ ${key} page ${page}: added ${results.length} items`);

  } catch (err) {
    const message = err.response?.status || err.message;
    if (err.response?.status === 429) {
      console.warn(`⏳ Rate limited on ${key} page ${page}. Waiting 10s...`);
      await delay(10000);
      return fetchPage(url, type, category, page, seen, allIDs, progress, key);
    } else {
      console.warn(`⚠️ Skipping ${key} page ${page} due to error:`, message);
    }
  }
}

async function runQueue(tasks, limit) {
  let index = 0;
  async function next() {
    if (index >= tasks.length) return;
    const i = index++;
    await tasks[i]();
    await next();
  }
  const runners = [];
  for (let i = 0; i < Math.min(limit, tasks.length); i++) {
    runners.push(next());
  }
  await Promise.all(runners);
}

exports.fetchAll = async () => {
  const currentStatus = await getStatus();

  if (currentStatus === "fetching") {
    console.log("⛔️ Fetch already in progress. Aborting new fetch.");
    return;
  }

  const nextTime = await getNextFetchTime(); // e.g., from DB or file
  const now = Date.now();

  if (nextTime && now < nextTime) {
    const remainingMs = nextTime - now;
    const remainingSec = Math.floor(remainingMs / 1000);
    const hours = Math.floor(remainingSec / 3600);
    const minutes = Math.floor((remainingSec % 3600) / 60);
    const seconds = remainingSec % 60;

    console.log(`⏱ Too early. Next fetch scheduled for: ${new Date(nextTime).toISOString()}`);
    console.log(`⏳ Time remaining: ${hours}h ${minutes}m ${seconds}s`);
    return;
  }



  await setStatus("fetching");

  const allIDs = {};
  const progress = {};

  try {
    const categories = endpoints.movies;

    for (const [category, url] of Object.entries(categories)) {
      all_movies = [];
      const key = `movies.${category}`;
      allIDs[category] = allIDs[category] || [];
      const seen = new Set(allIDs[category]);
      const startPage = progress[key] || 1;

      const tasks = [];
      for (let page = startPage; page <= 5; page++) {
        tasks.push(() => fetchPage(url, "movies", category, page, seen, allIDs, progress, key));
      }

      console.log(`🚀 Fetching ${key} with ${tasks.length} pages...`);
      await runQueue(tasks, CONCURRENCY_LIMIT);

      await saveMovies(all_movies); // Save per category after fetch
    }

    saveJSON(OUTPUT_FILE, allIDs);
    await setNextFetchTime(new Date(Date.now() + 24 * 60 * 60 * 1000));

    console.log("🎉 Done! All data saved.");
  } catch (error) {
    console.error("❌ Fetching process failed:", error);
  } finally {
    await setStatus("idle");
  }
};

let isShuttingDown = false;

async function cleanupAndExit(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 ${signal} received. Cleaning up...`);

  try {
    await setStatus("idle");
    console.log("✅ Status reset to 'idle'.");
  } catch (err) {
    console.error("❌ Failed to reset status:", err.message);
  }

  process.exit(0);
}

process.on("SIGINT", () => cleanupAndExit("SIGINT"));
process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));
