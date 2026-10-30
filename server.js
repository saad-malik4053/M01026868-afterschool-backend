require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const logger = require('./middleware/logger');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(logger);