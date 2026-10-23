// Supermarket Inventory and Billing System - Express Server
// Preserves Stage 1 starter architecture and connects official MongoDB driver
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getDB } = require('./db/connection');
const { seedDatabase } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (Extended from Stage 1)
app.get('/api/health', async (req, res) => {
  try {
    const db = getDB();
    await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    res.json({
      status: 'ok',
      database: db.databaseName,
      serverTime: new Date().toISOString(),
      collectionsCount: collections.length
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Reset & Reseed Database endpoint (Helpful for Lab Viva Demonstrations)
app.post('/api/reset-seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Database reseeded successfully with original DA-2 dataset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/bills', require('./routes/billing'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/analytics', require('./routes/analytics'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Server bootstrapper
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Supermarket Inventory & Billing System running!`);
      console.log(`  URL: http://localhost:${PORT}`);
      console.log(`  Environment: Database = ${process.env.DB_NAME || 'supermarket_db'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Could not start the server:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
