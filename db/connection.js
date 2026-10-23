// Database connection manager using the official MongoDB Node.js driver.
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'supermarket_db';

const client = new MongoClient(uri);
let db = null;

// Opens the connection once and caches it (Singleton pattern)
async function connectDB() {
  if (db) return db;
  try {
    await client.connect();
    db = client.db(dbName);
    console.log(`✓ Connected to MongoDB [${uri}], Database: [${dbName}]`);
    return db;
  } catch (err) {
    console.error(`✗ MongoDB Connection Error: ${err.message}`);
    throw err;
  }
}

// Access the connected database instance
function getDB() {
  if (!db) {
    throw new Error('Database is not connected yet. Call connectDB() first.');
  }
  return db;
}

// Graceful disconnection helper
async function closeDB() {
  if (client) {
    await client.close();
    db = null;
    console.log('✓ MongoDB connection closed.');
  }
}

module.exports = { connectDB, getDB, closeDB, client, dbName, uri };
