const axios = require("axios");
const { Movie, Series } = require("./models");
require("dotenv").config();
const { encrypt } = require("./helpers/crypto-helper");
const fs = require("fs");
const path = require("path");

// Load JSONs once
const moviesJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "movies.json"), "utf8")
);
const seriesJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "series.json"), "utf8")
);

async function fetchFromJson(id, type) {
    try {
        const list = type === "movie" ? moviesJson : seriesJson;
        const item = list.find((x) => Number(x.id) === Number(id));

        if (!item) return { posterUrl: null, backdropUrl: null };

        return {
            posterUrl: item.posterUrl || null,
            backdropUrl: item.backdropUrl || null,
        };

    } catch (err) {
        console.error(`JSON Fetch Failed for ID ${id}:`, err.message);
        return { posterUrl: null, backdropUrl: null };
    }
}

// PROCESS USING 500 PARALLEL PROMISES
async function encryptImages(table, type) {
    const batchSize = 2000;
    let offset = 0;

    while (true) {
        const rows = await table.findAll({ limit: batchSize, offset });
        if (rows.length === 0) break;

        console.log(`Processing ${rows.length} rows concurrently...`);

        // Process 500 rows at the SAME TIME
        const tasks = rows.map(async (row) => {
            try {
                const file = await fetchFromJson(row.id, type);
                let updated = false;

                // Poster
                if (file.posterUrl) {
                    const filename = file.posterUrl.split("/").filter(Boolean).pop();
                    if (filename) {
                        row.posterUrl = file.posterUrl;
                        row.posterPath = `/image/p/${encrypt(filename)}`;
                        updated = true;
                    }
                }

                // Backdrop
                if (file.backdropUrl) {
                    const filename = file.backdropUrl.split("/").filter(Boolean).pop();
                    if (filename) {
                        row.backdropUrl = file.backdropUrl;
                        row.backdropPath = `/image/b/${encrypt(filename)}`;
                        updated = true;
                    }
                }

                if (updated) await row.save();
            } catch (error) {
                console.error(`Error processing row ID ${row.id}:`, error.message);
            }
        });

        // Run all 500 tasks at once
        await Promise.allSettled(tasks);

        offset += batchSize;
        console.log(`✔ Finished ${offset}`);
    }
}

// RUN MAIN PROCESS
(async () => {
    try {
        console.log("Starting image encryption with 2000 concurrent workers...");

        await encryptImages(Movie, "movie");
        await encryptImages(Series, "tv");

        console.log("🎉 FINISHED — All data re-encrypted successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error:", err);
        process.exit(1);
    }
})();
