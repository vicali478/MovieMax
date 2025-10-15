const axios = require('axios');
const { Detail } = require("./models");

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const API_KEY = process.env.MY_TMDB_API_KEY_2;
const START_YEAR = 2004;
const END_YEAR = new Date().getFullYear();
const SERIES_PER_YEAR = 15;
const CHUNK_SIZE = 500; // safe batch size for bulkCreate


async function saveSeries(seriesList) {
  try {
    const formattedSeries = seriesList.map(show => ({
      ...show,
      genres: show.genre_ids || [],
    }));

    for (let i = 0; i < formattedSeries.length; i += CHUNK_SIZE) {
      const chunk = formattedSeries.slice(i, i + CHUNK_SIZE);

      await Detail.bulkCreate(chunk, {
        ignoreDuplicates: true, // only works if tmdb_id or id is unique in DB
      });

      console.log(`✅ Saved ${chunk.length} series (batch ${i / CHUNK_SIZE + 1})`);
    }

  } catch (error) {
    console.error("❌ Failed during bulk series insert:", error.message);
  }
}

// Fetch top TV shows by year
async function fetchSeriesByYear(year) {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/discover/tv', {
      params: {
        api_key: API_KEY,
        sort_by: 'popularity.desc',
        first_air_date_year: year,
        page: 1
      }
    });

    const series = res.data.results;
    console.log(`✅ ${year}: ${series.length} series fetched`);
    return { year, series };
  } catch (err) {
    console.error(`❌ Failed to fetch series for ${year}:`, err.message);
    return { year, series: [] };
  }
}

// Express controller
exports.getSeriesGroupedByYear = async (req, res) => {
  try {
    const yearRange = Array.from(
      { length: END_YEAR - START_YEAR + 1 },
      (_, i) => START_YEAR + i
    );

    const results = await Promise.all(yearRange.map(fetchSeriesByYear));

    const allYearsData = results.reduce((acc, { year, series }) => {
      acc[year] = series;
      return acc;
    }, {});

    // Flatten all series into a single array
    const allSeries = Object.values(allYearsData).flat();

    // Save all series to the database
    await saveSeries(allSeries);

    res.json({
      success: true,
      years: allYearsData
    });
  } catch (error) {
    console.error('❌ Error in getSeriesGroupedByYear:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group series by year',
      error: error.message
    });
  }
};

// TMDb genre list (TV genres instead of movie genres)
const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, 'tv_genres.json'))).genres;

async function fetchSeriesByGenre(genreId) {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/discover/tv', {
      params: {
        api_key: API_KEY,
        sort_by: 'popularity.desc',
        with_genres: genreId,
        page: 1
      }
    });

    const series = res.data.results.slice(0, SERIES_PER_YEAR);
    console.log(`✅ Genre ${genreId}: ${series.length} series fetched`);
    return { genreId, series };
  } catch (err) {
    console.error(`❌ Failed to fetch series for genre ${genreId}:`, err.message);
    return { genreId, series: [] };
  }
}

exports.getSeriesGroupedByGenre = async (req, res) => {
  try {
    const results = await Promise.all(GENRES.map(g => fetchSeriesByGenre(g.id)));

    const allGenresData = results.reduce((acc, { genreId, series }) => {
      const genre = GENRES.find(g => g.id === genreId);
      if (genre) acc[genre.name] = series;
      return acc;
    }, {});

    // Flatten all series into a single array
    const allSeries = Object.values(allGenresData).flat();

    // Save all series to the database
    await saveSeries(allSeries);

    res.json({
      success: true,
      genres: allGenresData
    });
  } catch (error) {
    console.error('❌ Error in getSeriesGroupedByGenre:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to group series by genre',
      error: error.message
    });
  }
};

/**
 * Fetch TV shows from TMDb between 2006 and today, sorted A–Z by name
 * GET /tmdb/series/alpha?page=1
 */
exports.getSeriesAlphaSorted = async (req, res) => {
  const BASE_URL = 'https://api.themoviedb.org/3/discover/tv';
  const page = req.query.page || 1;
  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        language: 'en-US',
        sort_by: 'name.asc', // TV uses "name"
        include_adult: false,
        page,
        first_air_date_gte: '2006-01-01',
        first_air_date_lte: today
      }
    });

    const series = response.data.results;

    res.json({
      success: true,
      page: parseInt(page),
      total_results: response.data.total_results,
      total_pages: response.data.total_pages,
      series
    });
  } catch (error) {
    console.error('❌ TMDb fetch failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch TMDb series',
      error: error.message
    });
  }
};
