const express = require('express');
const router = express.Router();
const tvController = require('../controllers/series.controller');
const getInfo = require('../info').getTvDetails;
const fetchPopular = require("../popularTv");

//const { getTvsGroupedByYear, getTvsGroupedByGenre} = require('../fetchTvs');

 router.get('/grouped-by-year', tvController.groupByYear);
 router.get('/grouped-by-genre', tvController.groupByGenre);
 router.get('/category/a_z/:page', tvController.getTvsAZ);
 router.get('/category/latest/:page', tvController.getLatestTvs);
// router.get('/categories/:category/:page', tvController.getCategory);
 router.get('/year/:year/:page', tvController.getYear);
// router.get('/', tvController.getAllTvs);
router.get('/genre/:page', tvController.getGenre);
// //router.get('/search/:page', tvController.search);
router.get('/trending', tvController.getTrendingTvs);
router.get('/category/popular/:page', tvController.getPopularTvs);
router.get('/id/:id', tvController.getTvById, getInfo);
router.get('/fetch-popular', fetchPopular);

module.exports = router;
