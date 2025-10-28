const express = require('express');
const router = express.Router();
const tvController = require('../controllers/series.controller');
router.get("/:id/:title", tvController.downloads);

module.exports = router;
