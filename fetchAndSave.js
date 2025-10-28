const axios = require('axios');
const { Movie, Series, Cast, Crew, Trailer, RecommendedMovie, RecommendedSeries, SeriesTrailer, SeriesCrew, SeriesCast, Season, Episode } = require('./models');
const fs = require('fs');
const path = require('path');
const { Op, fn, col, literal, Sequelize } = require('sequelize');

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

async function filterMovieAttributes(url) {

    let movie = await fetchInfo(url);

    if (movie === null) {
        console.error(`❌ Failed to fetch movie details for URL: ${url}`);
        return null;
    }

    //remove watchProviders
    delete movie.watchProviders;
    delete movie.createdAt;
    delete movie.updatedAt;
    delete movie._count;
    delete movie.favorite;
    delete movie.lastAiredEpisode;
    delete movie.clicksCount;
    delete movie.published;


    movie.f_id = movie.id; // keep original f_id

    movie.videos = (movie.videos || []).map(v => ({
        name: v.name,
        key: v.key,
        site: v.site,
    }));

    movie.casts = (movie.casts || []).map(cast => ({
        castId: cast.id,
        character: cast.character,
        creditId: cast.creditId,
        profilePath: cast.profileUrl,
        name: cast.name,
        order: cast.order,
    }));

    movie.crew = (movie.crew || []).map(crew => ({
        castId: crew.id,
        department: 'crew',
        creditId: crew.creditId,
        profilePath: crew.profileUrl,
        name: crew.name,
        job: crew.job,
        order: crew.order,
    }));

    movie.recommendations = movie.recommendations.map(rec => ({
        f_id: rec.id,
        title: rec.title,
        slug: rec.slug,
        genres: rec.genres,
        posterUrl: rec.posterUrl,
        backdropUrl: rec.backdropUrl,
        year: rec.releaseDate ? new Date(rec.releaseDate).getFullYear() : null,
        releaseDate: rec.releaseDate,
        runtime: rec.runtime,
        type: rec.type || 'movie',
        voteAverage: rec.voteAverage,
        tmdbId: rec.tmdbId || null,
        voteCount: rec.voteCount || null
    }));

    movie.type = 'movie';

    delete movie.id

    return movie;

}

async function filterTvAttributes(url) {

    let tv = await fetchInfo(url);

    if (tv === null) {
        console.error(`❌ Failed to fetch tv details for URL: ${url}`);
        return null;
    }


    //remove watchProviders
    delete tv.watchProviders;
    delete tv.createdAt;
    delete tv.updatedAt;
    delete tv._count;
    delete tv.favorite;
    delete tv.lastAiredEpisode;


    tv.f_id = tv.id; // keep original f_id
    tv.seasons = tv.seasons.map(season => {
        season.f_id = season.id;
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
        name: v.name,
        key: v.key,
        site: v.site,
    }));

    tv.casts = (tv.casts || []).map(cast => ({
        castId: cast.id,
        character: cast.character,
        creditId: cast.creditId,
        profilePath: cast.profileUrl,
        name: cast.name,
        order: cast.order,
    }));

    tv.crew = (tv.crew || []).map(crew => ({
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
    delete tv.id;
    return tv;

}


// Helpers
const formatDateForMySQL = (date) =>
    date.toISOString().slice(0, 19).replace('T', ' ');

// Update movie base info
async function saveMovie(data) {
    try {

        const movieData = {
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
            next_update: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next update in 30 days
        }

        let movie = await Movie.findOne({
            where: {
                f_id: data.f_id
            }
        });
        if (!movie) {

            movie = await Movie.create(movieData);
        } else {
            await movie.update(movieData);
        }

        if (!movie) {
            return null;
        }
        return movie.id;

    } catch (error) {
        console.error("❌ Failed to update movie:", error.message);
        return null
    }
}

async function saveTv(data) {
    try {

        const tvData = {
            f_id: data.f_id,
            title: data.title || 'Untitled',
            posterUrl: data.posterUrl || null,
            firstAirDate: data.firstAirDate ? new Date(data.firstAirDate) : null,
            voteAverage: data.voteAverage || null,
            runtime: data.runtime || null,
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
            next_update: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next update in 30 days
        }

        let tv = await Series.findOne({
            where: {
                f_id: data.f_id
            }
        });
        if (!tv) {

            tv = await Series.create(tvData);
        } else {
            await tv.update(tvData);
        }

        if (!tv) {
            return null;
        }
        return tv.id;

    } catch (error) {
        console.error("❌ Failed to update tv:", error.message);
        return null
    }
}


const GENRES = JSON.parse(fs.readFileSync(path.join(__dirname, 'genres.json'))).genres;
// Save full details (cast, crew, trailers)
async function saveDetails(result) {
    try {

        // ✅ save main movie details
        const newId = await saveMovie(result);

        if (!newId) {
            console.error("❌ Invalid movie data: missing newId");
            return false;
        }

        await Promise.all([
            Cast.destroy({ where: { movie_id: newId } }),
            Crew.destroy({ where: { movie_id: newId } }),
            Trailer.destroy({ where: { movie_id: newId } }),
        ]);
        // Bulk insert in parallel 
        await Promise.all([
            Cast.bulkCreate(result.casts.map(e => {
                e.movie_id = newId;
                return e;
            })),
            Crew.bulkCreate(result.crew.map(e => {
                e.movie_id = newId;
                return e;
            })),
            Trailer.bulkCreate(result.videos.map(e => {
                e.movie_id = newId;
                return e;
            })),]);

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
                                movie_id: newId,
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

        console.log(`✅ Successfully saved details for movie ID: ${result.f_id}`);
        return true;
    } catch (error) {
        console.error("❌ Failed during saveDetails:", error.message);
        return false;
    }
}

async function saveTvDetails(result) {
    try {

        console.log('Saving TV details for f_id:', result.f_id);
        // ✅ Update main tv details
        const newId = await saveTv(result);

        if (!newId) {
            console.error("❌ Invalid tv data: missing newId");
            return false;
        }

        console.log('Clearing old data for series ID:', newId);

        await Promise.all([
            SeriesCast.destroy({ where: { seriesId: newId } }),
            SeriesCrew.destroy({ where: { seriesId: newId } }),
            SeriesTrailer.destroy({ where: { seriesId: newId } }),
            Season.destroy({ where: { seriesId: newId } }),
        ]);
        // Bulk insert in parallel 
        await Promise.all([SeriesCast.bulkCreate(result.casts.map(e => {
            e.seriesId = newId;
            return e;
        })),
        SeriesCrew.bulkCreate(result.crew.map(e => {
            e.seriesId = newId;
            return e;
        })),
        SeriesTrailer.bulkCreate(result.videos.map(e => {
            e.seriesId = newId;
            return e;
        })),]);


    // Insert seasons and episodes
    if (Array.isArray(result.seasons) && result.seasons.length > 0) {
      await Promise.all(
        result.seasons.map(async (s) => {
          try {
            // Create the season
            s.seriesId = newId;
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
                                seriesId: newId,
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

        console.log(`✅ Successfully saved details for tv ID: ${result.f_id}`);
        return true;
    } catch (error) {
        console.error("❌ Failed during saveDetails:", error.message);
        return false;
    }
}


exports.getAllMovieDetails = async (id) => {

    try {

        const url = `https://www.films365.org/movie/${id}`;

        const fullInfo = await filterMovieAttributes(url);

        if (fullInfo) {

            const saved = await saveDetails(fullInfo);
            if (saved) return fullInfo
        }

        return null

    } catch (error) {
        console.error('❌ Error in getMovieDetails:', error.message);
    }
};

exports.getAllTvDetails = async (id) => {

    try {

        const url = `https://www.films365.org/tv/${id}?season=1&episode=1`;

        console.log('Fetching TV details for URL:', url);
        const fullInfo = await filterTvAttributes(url);

        if (fullInfo) {
            const saved = await saveTvDetails(fullInfo);
            if (saved) {
                return fullInfo;
            }
        }

    } catch (error) {
        console.error('❌ Error in gettvDetails:', error.message);
    }
};
