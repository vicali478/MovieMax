const express = require('express');
const app = express();
const { sequelize } = require('./models');

require('dotenv').config();
app.use(express.json());

const fs = require('fs');
const path = require('path');
const cors = require('cors');
app.use(cors());

app.use(express.static(path.join(__dirname, 'movies')));

// Example route if you want to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'movies', 'movies.html'));
});

// Example to serve a specific HTML file by name
// app.get('/:page', (req, res) => {
//   const filePath = path.join(__dirname, 'movies', `${req.params.page}.html`);
//   res.sendFile(filePath, err => {
//     if (err) res.status(404).send('Page not found');
//   });
// });



// Import routers
// e.g., app.use('/api/movies', require('./routes/movies'))
app.use('/api/movies', require('./routes/movies'));
app.use('/api/tvs', require('./routes/series'));
app.use('/tv', require('./routes/download'));
//app.use('/api/casts', require('./routes/casts'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await sequelize.authenticate();
  console.log(`Server is running on http://localhost:${PORT}`);
});

// const os = require('os');

// app.listen(PORT, async () => {
//   await sequelize.authenticate();

//   // Get local IPv4 address
//   const networkInterfaces = os.networkInterfaces();
//   let localIP = "localhost";

//   for (const iface of Object.values(networkInterfaces)) {
//     for (const config of iface) {
//       if (config.family === "IPv4" && !config.internal) {
//         localIP = config.address;
//         break;
//       }
//     }
//   }

//   console.log(`✅ Server is running on:`);
//   console.log(`   Local:   http://localhost:${PORT}`);
//   console.log(`   Network: http://${localIP}:${PORT}`);
// });
