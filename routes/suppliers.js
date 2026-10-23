const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/suppliers - List all suppliers
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const list = await db.collection('suppliers').find({}).sort({ Supplier_ID: 1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id - Single supplier
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const item = await db.collection('suppliers').findOne({ Supplier_ID: id });
    if (!item) return res.status(404).json({ error: `Supplier ${id} not found` });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers - Create supplier
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Supplier_ID, Company_Name, Contact_Person, Phone } = req.body;
    if (!Company_Name) return res.status(400).json({ error: 'Company_Name is required' });

    if (!Supplier_ID) {
      const last = await db.collection('suppliers').find().sort({ Supplier_ID: -1 }).limit(1).toArray();
      Supplier_ID = last.length > 0 ? last[0].Supplier_ID + 1 : 101;
    } else {
      Supplier_ID = parseInt(Supplier_ID, 10);
    }

    const doc = {
      Supplier_ID,
      Company_Name: String(Company_Name).trim(),
      Contact_Person: Contact_Person ? String(Contact_Person).trim() : null,
      Phone: Phone ? String(Phone).trim() : null
    };

    await db.collection('suppliers').insertOne(doc);
    res.status(201).json({ message: 'Supplier created successfully', supplier: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Supplier_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Company_Name, Contact_Person, Phone } = req.body;

    const updateFields = {};
    if (Company_Name !== undefined) updateFields.Company_Name = String(Company_Name).trim();
    if (Contact_Person !== undefined) updateFields.Contact_Person = Contact_Person ? String(Contact_Person).trim() : null;
    if (Phone !== undefined) updateFields.Phone = Phone ? String(Phone).trim() : null;

    const result = await db.collection('suppliers').updateOne({ Supplier_ID: id }, { $set: updateFields });
    if (result.matchedCount === 0) return res.status(404).json({ error: `Supplier ${id} not found` });

    const updated = await db.collection('suppliers').findOne({ Supplier_ID: id });
    res.json({ message: 'Supplier updated', supplier: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const batches = await db.collection('batch_inventory').countDocuments({ Supplier_ID: id });
    if (batches > 0) {
      return res.status(400).json({ error: `Cannot delete supplier: ${batches} inventory batch(es) linked.` });
    }

    const result = await db.collection('suppliers').deleteOne({ Supplier_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Supplier ${id} not found` });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
