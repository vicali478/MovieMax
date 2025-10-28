const fs = require("fs");
const { getDetails } = require("./details");
const { Movie } = require("./models");
const { Op } = require("sequelize");
const MAX_RETRIES = 3;

/**
 * Fetches detailed movie information with retry logic
 */
async function fetchInfo(movieId, attempt = 1) {
    try {
        const details = await getDetails(movieId);
        return details ?? null;
    } catch (err) {
        console.error(`⚠️ Error fetching details (Attempt ${attempt}):`, err.message);
        if (attempt < MAX_RETRIES) {
            return fetchInfo(movieId, attempt + 1);
        }
        return null;
    }
}

/**
 * Fetches and processes watch provider information
 */
async function fetchWatchProviders(movieId) {
    const movie = await fetchInfo(movieId);

    if (!movie) {
        console.error(`❌ Failed to fetch movie details for ID: ${movieId}`);
        return null;
    }

    // Ensure data exists safely
    const results = movie.watchProviders?.results;
    if (!results || typeof results !== "object") {
        console.error(`⚠️ No watch providers found for movie ID: ${movieId}`);
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


    // Save the result or print to console
    console.log(`✅ Providers for movie ${movieId}:`);
    console.log(JSON.stringify(uniqueProviders, null, 2));

    return uniqueProviders;
}

const BATCH_SIZE = 50;

async function main() {
    try {
        // Fetch all movies with non-null spokenLanguages
        const movies = await Movie.findAll({
            where: {
                watchProviders: null,
            },
            attributes: ["f_id"],
        });

        if (!movies.length) {
            console.log("⚠️ No movies found with a valid spokenLanguages.");
            return;
        }

        console.log(`🎬 Found ${movies.length} movies. Fetching providers in batches of ${BATCH_SIZE}...`);

        // // Process in chunks of 50
        // for (let i = 0; i < movies.length; i += BATCH_SIZE) {
        //     const batch = movies.slice(i, i + BATCH_SIZE);

        //     console.log(`🚀 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(movies.length / BATCH_SIZE)}...`);

        //     // Run all 50 in parallel
        //     const results = await Promise.allSettled(
        //         batch.map(async (movie) => {
        //             const movieId = movie.f_id;
        //             const providers = await fetchWatchProviders(`https://www.films365.org/movie/${movieId}`);

        //             if (providers && providers.length > 0) {
        //                 await Movie.update(
        //                     { watchProviders: JSON.stringify(providers) },
        //                     { where: { f_id: movieId } }
        //                 );
        //                 console.log(`💾 Saved providers for movie: ${movieId}`);
        //             } else {
        //                 console.log(`⚠️ No providers found for movie: ${movieId}`);
        //             }
        //         })
        //     );

        //     // Log any rejections for debugging
        //     const failed = results.filter(r => r.status === "rejected");
        //     if (failed.length > 0) {
        //         console.warn(`⚠️ ${failed.length} movies failed in this batch.`);
        //         failed.forEach((f, idx) => console.error(`   ❌ Error ${idx + 1}:`, f.reason?.message || f.reason));
        //     }

        //     // Optional delay between batches (helps avoid rate-limiting)
        //     await new Promise(res => setTimeout(res, 3000));
        // }

        console.log("✅ All done!");
    } catch (err) {
        console.error("❌ Error in main:", err);
    }
}

main();


// Run the script directly
if (require.main === module) {
    main();
}

module.exports = { fetchWatchProviders };
