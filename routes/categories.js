const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const list = await db.collection('categories').find({}).sort({ Category_ID: 1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:id - Single category
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const cat = await db.collection('categories').findOne({ Category_ID: id });
    if (!cat) return res.status(404).json({ error: `Category ${id} not found` });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories - Create category
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Category_ID, Category_Name } = req.body;
    if (!Category_Name) return res.status(400).json({ error: 'Category_Name is required' });

    if (!Category_ID) {
      const last = await db.collection('categories').find().sort({ Category_ID: -1 }).limit(1).toArray();
      Category_ID = last.length > 0 ? last[0].Category_ID + 1 : 1;
    } else {
      Category_ID = parseInt(Category_ID, 10);
    }

    const doc = { Category_ID, Category_Name: String(Category_Name).trim() };
    await db.collection('categories').insertOne(doc);
    res.status(201).json({ message: 'Category created successfully', category: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Category_ID already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Category_Name } = req.body;
    if (!Category_Name) return res.status(400).json({ error: 'Category_Name is required' });

    const result = await db.collection('categories').updateOne(
      { Category_ID: id },
      { $set: { Category_Name: String(Category_Name).trim() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: `Category ${id} not found` });

    const updated = await db.collection('categories').findOne({ Category_ID: id });
    res.json({ message: 'Category updated', category: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    // Check if products exist in this category
    const count = await db.collection('products').countDocuments({ Category_ID: id });
    if (count > 0) {
      return res.status(400).json({ error: `Cannot delete category: ${count} product(s) linked to this category.` });
    }

    const result = await db.collection('categories').deleteOne({ Category_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Category ${id} not found` });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
