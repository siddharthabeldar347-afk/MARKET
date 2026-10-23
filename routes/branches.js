const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/branches - List all branches
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const list = await db.collection('branches').find({}).sort({ Branch_ID: 1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/branches/:id - Single branch
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const item = await db.collection('branches').findOne({ Branch_ID: id });
    if (!item) return res.status(404).json({ error: `Branch ${id} not found` });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/branches - Create branch
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Branch_ID, Location, Phone } = req.body;
    if (!Location) return res.status(400).json({ error: 'Location is required' });

    if (!Branch_ID) {
      const last = await db.collection('branches').find().sort({ Branch_ID: -1 }).limit(1).toArray();
      Branch_ID = last.length > 0 ? last[0].Branch_ID + 1 : 1;
    } else {
      Branch_ID = parseInt(Branch_ID, 10);
    }

    const doc = {
      Branch_ID,
      Location: String(Location).trim(),
      Phone: Phone ? String(Phone).trim() : null
    };

    await db.collection('branches').insertOne(doc);
    res.status(201).json({ message: 'Branch created successfully', branch: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Branch_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/branches/:id - Update branch
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Location, Phone } = req.body;

    const updateFields = {};
    if (Location !== undefined) updateFields.Location = String(Location).trim();
    if (Phone !== undefined) updateFields.Phone = Phone ? String(Phone).trim() : null;

    const result = await db.collection('branches').updateOne({ Branch_ID: id }, { $set: updateFields });
    if (result.matchedCount === 0) return res.status(404).json({ error: `Branch ${id} not found` });

    const updated = await db.collection('branches').findOne({ Branch_ID: id });
    res.json({ message: 'Branch updated', branch: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/branches/:id - Delete branch
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const empCount = await db.collection('employees').countDocuments({ Branch_ID: id });
    if (empCount > 0) return res.status(400).json({ error: `Cannot delete branch: ${empCount} employee(s) assigned.` });

    const batchCount = await db.collection('batch_inventory').countDocuments({ Branch_ID: id });
    if (batchCount > 0) return res.status(400).json({ error: `Cannot delete branch: ${batchCount} inventory batch(es) assigned.` });

    const result = await db.collection('branches').deleteOne({ Branch_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Branch ${id} not found` });
    res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
