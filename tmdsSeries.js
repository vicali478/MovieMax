const fs = require("fs");
const axios = require("axios");
const progressDB = require("./progress").progressDB2;
const { Series } = require("./models"); // <-- use Series model
const { getAllTvDetails } = require('./fetchAndSave');

require('dotenv').config();
const API_KEY = process.env.MY_TMDB_API_KEY_2;
const OUTPUT_FILE = "categorized-series.json";
const CONCURRENCY_LIMIT = 60;
const CHUNK_SIZE = 500; // safe batch size for bulkCreate

const endpoints = {
  series: {
    trendingToday: `https://api.themoviedb.org/3/trending/tv/day`,
    trendingWeek: `https://api.themoviedb.org/3/trending/tv/week`,
    popular: `https://api.themoviedb.org/3/tv/popular`,
    topRated: `https://api.themoviedb.org/3/tv/top_rated`,
    onTheAir: `https://api.themoviedb.org/3/tv/on_the_air`,
    airingToday: `https://api.themoviedb.org/3/tv/airing_today`,
  },
};

let all_series = [];

function mapTmdbSeriesToModel(show) {
  return {
    id: show.id,
    title: show.name || null,                     // TV shows use "name"
    go_id: null,
    backdrop_path: show.backdrop_path || null,
    imdb_id: null,                                // not in discover/tv
    overview: show.overview || null,
    poster_path: show.poster_path || null,
    release_date: show.first_air_date || null,
    originCountry: show.origin_country?.join(",") || null,
    originalLanguage: show.original_language || null,
    popularity: show.popularity ?? null,
    voteAverage: show.vote_average ?? null,
    voteCount: show.vote_count ?? null,
    genres: show.genre_ids?.length ? show.genre_ids : [],
    last_air_date: null,                          // only in /tv/{id}
    next_update: null,
    episodeRunTime: null,
    last_episode_to_air: null,
    next_episode_to_air: null,
    tagline: null,
    status: null,
    numRatings: null,
  };
}


/** Save fetched series into DB */
async function saveSeries(series) {
  try {
    const formattedSeries = series.map(mapTmdbSeriesToModel);

    for (let i = 0; i < formattedSeries.length; i += CHUNK_SIZE) {
      const chunk = formattedSeries.slice(i, i + CHUNK_SIZE);

      await Series.bulkCreate(chunk, {
        ignoreDuplicates: true, // only works if `id` is unique in DB
      });

      console.log(`✅ Saved ${chunk.length} series (batch ${i / CHUNK_SIZE + 1})`);
    }
  } catch (error) {
    console.error("❌ Failed during bulk series insert:", error.message);
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
      const dateA = new Date(a.first_air_date || "1900-01-01");
      const dateB = new Date(b.first_air_date || "1900-01-01");
      return dateB - dateA;
    });

    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        allIDs[category].push(item.id);
        all_series.push(item);
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

  const nextTime = await getNextFetchTime();
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
    const categories = endpoints.series;

    for (const [category, url] of Object.entries(categories)) {
      all_series = [];
      const key = `series.${category}`;
      allIDs[category] = allIDs[category] || [];
      const seen = new Set(allIDs[category]);
      const startPage = progress[key] || 1;

      const tasks = [];
      for (let page = startPage; page <= 500; page++) {
        tasks.push(() => fetchPage(url, "series", category, page, seen, allIDs, progress, key));
      }

      console.log(`🚀 Fetching ${key} with ${tasks.length} pages...`);
      await runQueue(tasks, CONCURRENCY_LIMIT);

      await saveSeries(all_series); // Save per category after fetch
    }

    saveJSON(OUTPUT_FILE, allIDs);
    await setNextFetchTime(new Date(Date.now() + 24 * 60 * 60 * 1000));

    console.log("🎉 Done! All series data saved.");
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
