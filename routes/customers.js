const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/customers - List all customers (supports ?name=K filter from DA-2 Query 3)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const filter = {};
    if (req.query.name) {
      filter.Name = { $regex: req.query.name, $options: 'i' };
    }
    const list = await db.collection('customers').find(filter).sort({ Cust_ID: 1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id - Single customer
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const item = await db.collection('customers').findOne({ Cust_ID: id });
    if (!item) return res.status(404).json({ error: `Customer ${id} not found` });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Create customer
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Cust_ID, Name, Phn_No, Email } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });

    if (!Cust_ID) {
      const last = await db.collection('customers').find().sort({ Cust_ID: -1 }).limit(1).toArray();
      Cust_ID = last.length > 0 ? last[0].Cust_ID + 1 : 201;
    } else {
      Cust_ID = parseInt(Cust_ID, 10);
    }

    const doc = {
      Cust_ID,
      Name: String(Name).trim(),
      Phn_No: Phn_No ? String(Phn_No).trim() : null,
      Email: Email ? String(Email).trim() : null
    };

    await db.collection('customers').insertOne(doc);
    res.status(201).json({ message: 'Customer created successfully', customer: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Cust_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer (including DA-2 Query 11: update phone number)
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Name, Phn_No, Email } = req.body;

    const updateFields = {};
    if (Name !== undefined) updateFields.Name = String(Name).trim();
    if (Phn_No !== undefined) updateFields.Phn_No = Phn_No ? String(Phn_No).trim() : null;
    if (Email !== undefined) updateFields.Email = Email ? String(Email).trim() : null;

    const result = await db.collection('customers').updateOne({ Cust_ID: id }, { $set: updateFields });
    if (result.matchedCount === 0) return res.status(404).json({ error: `Customer ${id} not found` });

    const updated = await db.collection('customers').findOne({ Cust_ID: id });
    res.json({ message: 'Customer updated successfully', customer: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const billCount = await db.collection('bills').countDocuments({ Cust_ID: id });
    if (billCount > 0) return res.status(400).json({ error: `Cannot delete customer: ${billCount} bill transaction(s) linked.` });

    const result = await db.collection('customers').deleteOne({ Cust_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Customer ${id} not found` });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
