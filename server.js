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



const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('afterSchool');
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

function formatLesson(doc) {
  return {
    id:       doc._id.toString(),
    topic:    doc.topic,
    location: doc.location,
    price:    doc.price,
    space:    doc.space,
    icon:     doc.icon,
    image:    doc.image
  };
}