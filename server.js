const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();

// --- Basic Middlewares ---
app.set('trust proxy', true);
app.use(express.json());
app.use(cors());

// SEO / Security: Ensure API is not indexed by crawlers
app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
});

// --- Scramble Configuration ---
const SEGMENT_ORDER = [4, 0, 2, 1, 3];
const CHAR_MAPS = {
    8: [7, 0, 5, 2, 3, 4, 1, 6],
    4: [3, 1, 0, 2],
    12: [11, 0, 10, 1, 9, 2, 8, 3, 7, 4, 6, 5]
};

function decodeFinal(safeStr) {
    try {
        return Buffer.from(safeStr, 'base64url').toString('utf8');
    } catch (e) {
        return "";
    }
}

function unscrambleID(scrambled) {
    try {
        if (!scrambled) return null;
        const decoded = decodeFinal(scrambled);
        const parts = decoded.split('-');
        if (parts.length !== 5) return null;

        const segments = new Array(5);
        SEGMENT_ORDER.forEach((originalIdx, currentIdx) => {
            segments[originalIdx] = parts[currentIdx];
        });

        const originalSegments = segments.map((seg) => {
            const len = seg.length;
            const map = CHAR_MAPS[len];
            if (!map) throw new Error("Invalid segment length");
            const originalCharArr = new Array(seg.length);
            map.forEach((mappedIdx, i) => {
                originalCharArr[mappedIdx] = seg[i];
            });
            return originalCharArr.join('');
        });

        return originalSegments.join('-');
    } catch (e) {
        console.error("Unscramble failed:", e.message);
        return null;
    }
}

// --- API Routes ---

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'downloading Planet Mars', progress: '99.7%' });
});

// --- ROUTE: Download APK ---
// Fixed: Using app.get and handling fs existence check
app.get("/apk", (req, res) => {
    const filePath = path.join(__dirname, "uploads", "app-arm64-v8a-release.apk");

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('APK file not found on server.');
    }

    res.setHeader('Content-Disposition', 'attachment; filename=Wustream(v1.0.3).apk');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
        console.error('APK Stream Error:', err);
        if (!res.headersSent) res.status(500).send('Download failed.');
    });

    stream.pipe(res);
});

// --- ROUTE: Stream / Proxy ---
// Fixed: Use app.get instead of app.use for specific parameter routes
app.get('/:type/:token/:title', async (req, res) => {
    const { type, token, title } = req.params;

    console.log("📥 Incoming Request:", { type, token, title });

    if (!token || !title || !type) {
        return res.status(400).json({
            valid: false,
            reason: "Token payload incomplete"
        });
    }

    const realID = unscrambleID(token);
    if (!realID) {
        return res.status(400).json({
            valid: false,
            reason: "Invalid or tampered token"
        });
    }

    // Build the target URL (Company as Authenticator)
    const originalUrl = `https://xstreamx.films365.org/${type}/${realID}/${title}`;
    console.log("🚀 Proxying to:", originalUrl);

    try {
        const response = await axios({
            method: 'GET',
            url: originalUrl,
            responseType: 'stream',
            timeout: 60000,
            headers: {
                'User-Agent': 'WuStream-App/1.0'
            }
        });

        // Forward Headers
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        const safeTitle = title.replace(/[^\w\s()-]/g, '').trim();
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

        // Pipe the data
        response.data.pipe(res);

        response.data.on('error', (err) => {
            console.error('Stream error during transfer:', err.message);
            res.end();
        });

    } catch (err) {
        console.error('❌ Proxy Download failed:', err.message);
        if (err.response) {
            res.status(err.response.status).send(`Upstream Error: ${err.response.statusText}`);
        } else {
            res.status(500).send('Failed to connect to media server');
        }
    }
});

// --- Initialization ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ WuStream Authenticator running on port ${PORT}`);
});