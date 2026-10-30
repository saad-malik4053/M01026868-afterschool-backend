/* =============================================================
   seed.js — One-time script to populate the afterSchool database
   Run with: node seed.js
   ============================================================= */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function seed() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db('afterSchool');

    /* ---------------- Clear existing data ---------------- */
    await db.collection('lessons').deleteMany({});
    await db.collection('teachers').deleteMany({});
    await db.collection('orders').deleteMany({});
    console.log('🧹 Cleared lessons, teachers, orders');

    /* ---------------- Insert lessons ---------------- */
    const lessons = [
      { topic: 'Mathematics',        location: 'Hendon',        price: 100, space: 5, icon: 'fas fa-calculator',  image: 'school.jpg' },
      { topic: 'Computer Science',   location: 'Colindale',     price: 120, space: 5, icon: 'fas fa-laptop-code', image: 'school.jpg' },
      { topic: 'Physics',            location: 'Brent Cross',   price: 110, space: 5, icon: 'fas fa-atom',        image: 'classroom.jpg' },
      { topic: 'Chemistry',          location: 'Golders Green', price: 115, space: 5, icon: 'fas fa-flask',       image: 'books.jpg' },
      { topic: 'Biology',            location: 'Hendon',        price: 95,  space: 5, icon: 'fas fa-dna',         image: 'school.jpg' },
      { topic: 'English Literature', location: 'Colindale',     price: 90,  space: 5, icon: 'fas fa-book',        image: 'books.jpg' },
      { topic: 'History',            location: 'Brent Cross',   price: 85,  space: 5, icon: 'fas fa-landmark',    image: 'classroom.jpg' },
      { topic: 'Geography',          location: 'Golders Green', price: 80,  space: 5, icon: 'fas fa-globe',       image: 'school.jpg' },
      { topic: 'Art',                location: 'Hendon',        price: 75,  space: 5, icon: 'fas fa-palette',     image: 'classroom.jpg' },
      { topic: 'Music',              location: 'Colindale',     price: 105, space: 5, icon: 'fas fa-music',       image: 'books.jpg' },
      { topic: 'Physical Education', location: 'Brent Cross',   price: 70,  space: 5, icon: 'fas fa-running',     image: 'school.jpg' },
      { topic: 'French',             location: 'Golders Green', price: 88,  space: 5, icon: 'fas fa-language',    image: 'classroom.jpg' }
    ];

    const lessonResult = await db.collection('lessons').insertMany(lessons);
    const lessonIds = Object.values(lessonResult.insertedIds);
    console.log(`📚 Inserted ${lessonIds.length} lessons`);

    /* ---------------- Insert teachers ---------------- */
    const teachers = [
      {
        firstName: 'Mark',
        lastName: 'Jones',
        lessonIds: [lessonIds[0], lessonIds[1], lessonIds[2]]
      },
      {
        firstName: 'Sarah',
        lastName: 'Smith',
        lessonIds: [lessonIds[3], lessonIds[4], lessonIds[5]]
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        lessonIds: [lessonIds[6], lessonIds[7], lessonIds[8]]
      },
      {
        firstName: 'Emma',
        lastName: 'Wilson',
        lessonIds: [lessonIds[9], lessonIds[10], lessonIds[11]]
      }
    ];

    await db.collection('teachers').insertMany(teachers);
    console.log(`👩‍🏫 Inserted ${teachers.length} teachers`);

    console.log('\n🎉 Database seeded successfully');
    console.log('   → afterSchool.lessons:  12 docs');
    console.log('   → afterSchool.teachers: 4 docs');
    console.log('   → afterSchool.orders:   0 docs');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();