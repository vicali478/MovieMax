const fs = require("fs");
const axios = require("axios");
const path = require("path");
const progressDB = require("./progress").progressDB2;
const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, './genres.json'))).tv_genres;
const { Series } = require("./models");
const { Op } = require('sequelize');
const slugify = require('slugify');
const fSearch = require('./fSearch');
const e = require("express");
const { getAllTvDetails } = require('./fetchAndSave');

require('dotenv').config();
const API_KEY = process.env.MY_TMDB_API_KEY_2;
const OUTPUT_FILE = "categorized-tvs.json";
const CONCURRENCY_LIMIT = 60;
const CHUNK_SIZE = 100; // safe batch size for bulkCreate

const endpoints = {
  tvs: {
    trendingToday: `https://api.themoviedb.org/3/trending/tv/day`,
    trendingWeek: `https://api.themoviedb.org/3/trending/tv/week`,
    topRated: `https://api.themoviedb.org/3/tv/top_rated`,
    onTheAir: "https://api.themoviedb.org/3/tv/on_the_air",
    airingToday: "https://api.themoviedb.org/3/tv/airing_today",

  }
};

let all_tvs = [];


async function saveTvs(tvs) {
  try {
    const formattedTvs = tvs.map(tv => ({
      ...tv,
      genres: (tv.genre_ids || []).map(gen => GENRES.find((g) => parseInt(g.id) === parseInt(gen)).name),
    }));

    console.log(`🚀 Saving ${formattedTvs.length} tvs to database...`);
    for (let i = 0; i < formattedTvs.length; i += CHUNK_SIZE) {
      const chunk = formattedTvs.slice(i, i + CHUNK_SIZE);

      for (const tv of chunk) {
        tv.title = tv.name || 'Untitled';
        delete tv.name;
        console.log(tv);
        try {

          const slug = slugify(tv.title, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });

          console.log(`Processing: ${slug} (${tv.id})`);
          // ✅ Prepare data object with only non-null fields
          const data = {
            tmdbId: tv.id,
            title: tv.title || 'Untitled',
            slug,
            genres: tv.genres ? JSON.stringify(tv.genres) : undefined,
            posterUrl: tv.poster_path || undefined,
            firstAirDate: tv.first_air_date || undefined,
            runtime: tv.runtime || undefined,
            type: tv.type || 'tv',
            synopsis: tv.overview || undefined,
            backdropUrl: tv.backdrop_path || undefined,
            voteAverage: tv.vote_average || undefined,
          };

          // Remove undefined keys so they don’t overwrite existing DB fields
          Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

          // ✅ Try to find existing tv
          const existingTv = await Series.findOne({ where: { tmdbId: tv.id } });

          // 🔍 Helper function to safely search & attach f_id
          const searchAndAttachFid = async () => {
            const searched = await fSearch(tv.title);
            if (searched?.results?.length) {
              const match = searched.results.find(
                (r) => String(r.tmdbId) === String(tv.id)
              );
              if (match) {
                data.f_id = match.id;
                console.log(`✅ Found match for "${tv.title}" → f_id: ${match.id}`);
              } else {

                console.log(`⚠️ No exact match found for "${tv.title}"`);
              }
            } else {
              console.log(`⚠️ No search results for "${tv.title}"`);
            }
          };

          if (existingTv) {
            // Only fetch f_id if missing
            if (!existingTv.f_id) await searchAndAttachFid();

            //override tv data with existed data
            if (existingTv.title) data.title = existingTv.title;
            if (existingTv.slug) data.slug = existingTv.slug;
            if (existingTv.genres) data.genres = existingTv.genres;
            if (existingTv.posterUrl) data.posterUrl = existingTv.posterUrl;
            if (existingTv.releaseDate) data.releaseDate = existingTv.releaseDate;
            if (existingTv.runtime) data.runtime = existingTv.runtime;
            if (existingTv.type) data.type = existingTv.type;
            if (existingTv.synopsis) data.synopsis = existingTv.synopsis;
            if (existingTv.backdropUrl) data.backdropUrl = existingTv.backdropUrl;
            if (existingTv.voteAverage) data.voteAverage = existingTv.voteAverage;

            // ✅ Update only non-null fields
            await existingTv.update(data);
            console.log(`✅ Updated: ${tv.title || 'Untitled'}`);
          } else {
            // If new tv → always try searching for f_id
            await searchAndAttachFid();

            if (data.f_id) {
              const existedTv = await Series.findOne({ where: { f_id: data.f_id } });

              if (existedTv) {
                // If f_id already exists, just update the record

                //override Tv data with existed data
                if (existedTv.title) data.title = existedTv.title;
                if (existedTv.slug) data.slug = existedTv.slug;
                if (existedTv.genres) data.genres = existedTv.genres;
                if (existedTv.posterUrl) data.posterUrl = existedTv.posterUrl;
                if (existedTv.releaseDate) data.releaseDate = existedTv.releaseDate;
                if (existedTv.runtime) data.runtime = existedTv.runtime;
                if (existedTv.type) data.type = existedTv.type;
                if (existedTv.synopsis) data.synopsis = existedTv.synopsis;
                if (existedTv.backdropUrl) data.backdropUrl = existedTv.backdropUrl;
                if (existedTv.voteAverage) data.voteAverage = existedTv.voteAverage;
                await existedTv.update(data);
                console.log(`♻️ Updated existing by f_id: ${tv.title || 'Untitled'}`);
                continue; // Skip creation
              }
              
              let tvCreated = await getAllTvDetails(data.f_id) || {};
            }

            console.log(`🆕 Created: ${tv.title || 'Untitled'}`);
          }

          console.log(`🆕 Created: ${tv.title || tv.id}`);
        } catch (err) {

          console.error(`❌ Error saving ${tv.title || tv.id}:`, err.message);
        }
      }


      console.log(`✅ Saved ${chunk.length} tvs (batch ${i / CHUNK_SIZE + 1})`);
    }

  } catch (error) {
    console.error("❌ Failed during bulk tv insert:", error.message);
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
        all_tvs.push(item);
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
    const categories = endpoints.tvs;

    for (const [category, url] of Object.entries(categories)) {
      all_tvs = [];
      const key = `tvs.${category}`;
      allIDs[category] = allIDs[category] || [];
      const seen = new Set(allIDs[category]);
      const startPage = progress[key] || 1;

      const tasks = [];
      for (let page = startPage; page <= 5; page++) {
        tasks.push(() => fetchPage(url, "tvs", category, page, seen, allIDs, progress, key));
      }

      console.log(`🚀 Fetching ${key} with ${tasks.length} pages...`);
      await runQueue(tasks, CONCURRENCY_LIMIT);

      console.log(`🎉 Completed fetching ${key}. Total unique items: ${all_tvs.length}`);
      await saveTvs(all_tvs); // Save per category after fetch
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