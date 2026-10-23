const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/returns - List all returns with Batch and Product information ($lookup JOIN)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $lookup: {
          from: 'batch_inventory',
          localField: 'Batch_Number',
          foreignField: 'Batch_Number',
          as: 'batch'
        }
      },
      { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'products',
          localField: 'batch.Product_ID',
          foreignField: 'Product_ID',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Return_ID: 1,
          Return_date: 1,
          Batch_Number: 1,
          Quantity_returned: { $ifNull: ['$Quantity_returned', 1] },
          Reason: { $ifNull: ['$Reason', 'Not specified'] },
          Product_ID: '$product.Product_ID',
          Product_Name: '$product.Name',
          Current_Stock: '$batch.Stock_qty'
        }
      },
      { $sort: { Return_ID: -1 } }
    ];

    const list = await db.collection('returns').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/returns - Process customer return and increment stock ($inc)
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Return_ID, Batch_Number, Quantity_returned, Reason, Return_date } = req.body;

    if (!Batch_Number) return res.status(400).json({ error: 'Batch_Number is required.' });

    Batch_Number = parseInt(Batch_Number, 10);
    const qtyReturned = Quantity_returned !== undefined ? Math.max(1, parseInt(Quantity_returned, 10)) : 1;

    // Verify batch exists
    const batch = await db.collection('batch_inventory').findOne({ Batch_Number });
    if (!batch) return res.status(404).json({ error: `Batch #${Batch_Number} not found.` });

    // Determine Return_ID
    if (!Return_ID) {
      const last = await db.collection('returns').find().sort({ Return_ID: -1 }).limit(1).toArray();
      Return_ID = last.length > 0 ? last[0].Return_ID + 1 : 701;
    } else {
      Return_ID = parseInt(Return_ID, 10);
    }

    const retDate = Return_date || new Date().toISOString().split('T')[0];

    // Atomically increment inventory stock
    await db.collection('batch_inventory').updateOne(
      { Batch_Number },
      { $inc: { Stock_qty: qtyReturned } }
    );

    const doc = {
      Return_ID,
      Return_date: retDate,
      Batch_Number,
      Quantity_returned: qtyReturned,
      Reason: Reason ? String(Reason).trim() : 'Customer Return'
    };

    await db.collection('returns').insertOne(doc);

    const updatedBatch = await db.collection('batch_inventory').findOne({ Batch_Number }, { projection: { _id: 0, Stock_qty: 1 } });

    res.status(201).json({
      message: 'Return logged and inventory stock restored successfully',
      returnRecord: doc,
      updatedBatchStock: updatedBatch ? updatedBatch.Stock_qty : batch.Stock_qty + qtyReturned
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Return_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
