const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const csvRoutes = require('./routes/csvroutes');


const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
// Use the routes from the csvRoutes file
app.use('/', csvRoutes);
app.listen(8001);
