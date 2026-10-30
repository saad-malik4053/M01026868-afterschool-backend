/* =============================================================
   CST3144 — Full Stack Development
   Express back-end for the Afterschool Club coursework
   Student: M01026868
   ============================================================= */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const logger = require('./middleware/logger');

const app  = express();
const PORT = process.env.PORT || 3000;

/* =============================================================
   Global middleware
   ============================================================= */
app.use(cors());
app.use(express.json());
app.use(logger);

/* =============================================================
   Static image middleware (custom)
   Serves lesson images from public/images.
   Returns a JSON error if the file is missing.
   Required by brief: 4%
   ============================================================= */
app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;

  // Security: block path traversal (e.g. ../../etc/passwd)
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filepath = path.join(__dirname, 'public', 'images', filename);

  res.sendFile(filepath, (err) => {
    if (err) {
      return res.status(404).json({
        error:    'Image not found',
        filename: filename,
        message:  `The image "${filename}" does not exist on the server.`
      });
    }
  });
});

/* =============================================================
   MongoDB connection
   ============================================================= */
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

/* =============================================================
   Helper — convert Mongo document to front-end friendly shape
   Maps _id → id (string). Field name topic matches the brief
   and is consistent across DB, API, and front-end.
   ============================================================= */
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

/* =============================================================
   Health check
   ============================================================= */
app.get('/', (req, res) => {
  res.json({
    status:  'ok',
    message: 'Afterschool Club API is running',
    student: 'M01026868'
  });
});

/* =============================================================
   REST API — LESSONS
   ============================================================= */

/* ---- GET /lessons — return all lessons (2%) ---- */
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons.map(formatLesson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

/* ---- GET /lessons/search?q=... — CHALLENGE (6%)
        MUST be defined before /lessons/:id, otherwise
        Express treats "search" as an id ---- */
app.get('/lessons/search', async (req, res) => {
  try {
    const term = (req.query.q || '').trim();
    if (!term) return res.json([]);

    const regex = new RegExp(term, 'i');

    const results = await db.collection('lessons').aggregate([
      { $addFields: {
          priceStr: { $toString: '$price' },
          spaceStr: { $toString: '$space' }
      }},
      { $match: {
          $or: [
            { topic:    regex },
            { location: regex },
            { priceStr: regex },
            { spaceStr: regex }
          ]
      }}
    ]).toArray();

    res.json(results.map(formatLesson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/* ---- PUT /lessons/:id — update any attribute (3%)
        Used to update available spaces after an order ---- */
app.put('/lessons/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    const updates = { ...req.body };
    delete updates._id; // _id is immutable in MongoDB

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await db.collection('lessons').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const updated = await db.collection('lessons').findOne({ _id: new ObjectId(id) });
    res.json(formatLesson(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

/* =============================================================
   REST API — ORDERS
   ============================================================= */

/* ---- POST /orders — save new order (2%) ---- */
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, lessonIds, spaces, lessons } = req.body;

    if (!name || !phone || !Array.isArray(lessonIds) || typeof spaces !== 'number') {
      return res.status(400).json({ error: 'Missing required order fields' });
    }

    const order = {
      name,
      phone,
      lessonIds,
      spaces,
      lessons: lessons || [],   // [{ lessonId, quantity }] — for enrolment calc
      createdAt: new Date()
    };

    const result = await db.collection('orders').insertOne(order);

    res.status(201).json({
      _id:     result.insertedId.toString(),
      message: 'Order created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

/* =============================================================
   REST API — TEACHERS (CHALLENGE, 8%)
   ============================================================= */

/* ---- GET /teachers — list all teachers ---- */
app.get('/teachers', async (req, res) => {
  try {
    const teachers = await db.collection('teachers').find({}).toArray();
    res.json(teachers.map(t => ({
      _id:       t._id.toString(),
      firstName: t.firstName,
      lastName:  t.lastName
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

/* ---- GET /teachers/:id/lessons — lessons per teacher ---- */
app.get('/teachers/:id/lessons', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid teacher id' });
    }

    const teacher = await db.collection('teachers').findOne({ _id: new ObjectId(id) });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const lessons = await db.collection('lessons').find({
      _id: { $in: teacher.lessonIds }
    }).toArray();

    res.json(lessons.map(formatLesson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teacher lessons' });
  }
});

/* =============================================================
   REST API — ENROLMENT (CHALLENGE, 6%)
   Returns total spaces already purchased for a lesson.
   ============================================================= */
app.get('/enrolment/:lessonId', async (req, res) => {
  try {
    const lessonId = req.params.lessonId;

    const result = await db.collection('orders').aggregate([
      { $unwind: '$lessons' },
      { $match:  { 'lessons.lessonId': lessonId } },
      { $group:  { _id: null, total: { $sum: '$lessons.quantity' } } }
    ]).toArray();

    const enrolment = result.length > 0 ? result[0].total : 0;

    res.json({ lessonId, enrolment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate enrolment' });
  }
});

/* =============================================================
   Start server
   ============================================================= */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});