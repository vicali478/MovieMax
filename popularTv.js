const fs = require('fs');
const axios = require('axios');
const slugify = require('slugify');
const { Series } = require('./models');

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

async function fetchMovies(page = 1) {
    try {
        const url = "https://www.films365.org/popular";
        const payload = ["tv", page];

        const response = await axios.post(url, JSON.stringify(payload), {
            headers: {
                "accept": "text/x-component",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "en-GB,en;q=0.9,sw;q=0.8",
                "content-type": "text/plain;charset=UTF-8",
                "cookie": "__client_uat=0; __client_uat__ShoTZIZ=0; __cf_bm=tcP7PxE_Vbz.EruEoRxvO_DgaeAjir8SvCVWvsKqO3c-1760014643-1.0.1.1-EndSfH.rj7KW3wjbH8FH8wyATP9afIUHmIpdSb1JnnmpsgMVh_65QnzcD1oi8q8ld8AjYYcjNGtEP_EVIXuEkRMACk.kF7yiCZp0ZTiKIDw",
                "dnt": "1",
                "next-action": "70b37c3fe6b4835eecc52414fda105e561f8beebbe",
                "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(home)%22%2C%7B%22children%22%3A%5B%22popular%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fpopular%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
                "origin": "https://www.films365.org",
                "referer": "https://www.films365.org/popular",
                "sec-ch-ua": `"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"`,
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": `"Android"`,
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent":
                    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
            },

        });

        const text = response.data.toString();
        const chunks = text.split(/\n/).filter(Boolean);

        for (const chunk of chunks) {
            const sep = chunk.indexOf(":");
            if (sep !== -1) {
                const jsonStr = chunk.slice(sep + 1);
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.data) {
                        return {
                            data: parsed.data,
                            pagination: {
                                totalPages: parsed.totalPages || 1,
                                currentPage: parsed.currentPage || page,
                                totalRecords: parsed.totalRecords || parsed.data.length,
                            },
                        };
                    }
                } catch {
                    // skip invalid JSON chunk
                }
            }
        }
    } catch (err) {
        console.error(`❌ Error fetching page ${page}: ${err.message}`);
    }
    return null;
}

let isScraping = false;

async function scrapeAll(req, res) {
    // Block new requests if a scrape is already running
    if (isScraping) {
        return res.status(429).json({ success: false, message: "Scraping is already in progress." });
    }

    isScraping = true;

    try {
        const allData = [];
        const failedMovies = [];
        const successfulMovies = [];
        const failedData = [];

        console.log(`🚀 Fetching first page...`);
        const firstPage = await fetchMovies(1);
        if (!firstPage) {
            console.log("❌ Failed to fetch first page. Aborting.");
            return res.status(500).json({ success: false, message: "Failed to fetch first page" });
        }

        allData.push(...firstPage.data);
        const totalPages = firstPage.pagination.totalPages;

        console.log(`✅ Total pages found: ${totalPages}`);

        // Fetch pages in batches
        const concurrency = 50;

        for (let i = 2; i <= totalPages; i += concurrency) {
            const batch = [];
            const end = Math.min(i + concurrency - 1, totalPages);

            for (let p = i; p <= end; p++) batch.push(fetchMovies(p));

            console.log(`📦 Fetching pages ${i}–${end} concurrently...`);
            const results = await Promise.allSettled(batch);

            for (const result of results) {
                if (result.status === "fulfilled" && result.value?.data) {
                    allData.push(...result.value.data);
                }
            }

            console.log(`✅ Finished batch ${i}–${end}. Total so far: ${allData.length}`);
            await new Promise((r) => setTimeout(r, 2000)); // pause to avoid rate limit
        }

        const batches = chunkArray(allData, 1000);
        console.log(`Loaded ${allData.length} movies in ${batches.length} batches.\n`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🚀 Processing batch ${i + 1}/${batches.length} (${batch.length} movies)`);

            await Promise.all(
                batch.map(async (movie) => {
                    try {
                        if (!movie.id) return;
                        const slug = slugify(movie.title, {
                            lower: true,
                            strict: true,
                            remove: /[*+~.()'"!:@]/g,
                        });

                        let movieAdded = await Series.findOne({ where: { f_id: movie.id } });

                        if (!movieAdded) {
                            movieAdded = await Series.create({
                                f_id: movie.id,
                                title: movie.title || "Untitled",
                                slug,
                                genres: [],
                                posterUrl: movie.posterUrl || null,
                                year:
                                    movie.year ||
                                    (movie.firstAirDate
                                        ? new Date(movie.firstAirDate.replace("$D", "")).getFullYear()
                                        : null),
                                firstAirDate: movie.firstAirDate?.replace("$D", "") || null,
                                type: movie.type || "tv",
                                voteAverage: movie.voteAverage || null,
                            });
                        }

                        if (movieAdded) {
                            successfulMovies.push(movie.id);
                        } else {
                            failedMovies.push(movie);
                        }
                    } catch (err) {
                        console.error(`❌ Error inserting movie ID ${movie.id}:`, err.message);
                        failedData.push(movie);
                    }
                })
            );

            console.log(`✅ Batch ${i + 1} completed.\n`);
        }

        console.log("🎉 All batches completed successfully!");
        fs.writeFileSync("popular_tvs.json", JSON.stringify(successfulMovies, null, 2));
        fs.writeFileSync("failed.json", JSON.stringify(failedMovies, null, 2));
        fs.writeFileSync("error.json", JSON.stringify(failedData, null, 2));

        res.json({ success: true, message: `Scraped ${successfulMovies.length} movies.` });
    } catch (error) {
        console.error("❌ Scraping failed:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        // Always release the lock even if an error occurs
        isScraping = false;
    }
}


module.exports = scrapeAll;
