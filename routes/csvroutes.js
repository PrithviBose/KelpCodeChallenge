const express = require('express');
const router = express.Router();
const csvServices = require('../services/csvExport');


router.post('/getData', (req, res) => csvServices.convertCSVtoJSON(req, res));
router.get('/readData', (req, res) => csvServices.getData(res));


module.exports = router;