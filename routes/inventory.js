const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/inventory - List all batch inventory with Product, Supplier, Branch details ($lookup)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'Product_ID',
          foreignField: 'Product_ID',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'Supplier_ID',
          foreignField: 'Supplier_ID',
          as: 'supplier'
        }
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'branches',
          localField: 'Branch_ID',
          foreignField: 'Branch_ID',
          as: 'branch'
        }
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Batch_Number: 1,
          Product_ID: 1,
          Product_Name: '$product.Name',
          Supplier_ID: 1,
          Supplier_Name: '$supplier.Company_Name',
          Branch_ID: 1,
          Branch_Location: '$branch.Location',
          Mfg_date: 1,
          Exp_date: 1,
          Reorder_level: 1,
          Stock_qty: 1,
          Cost_Price: 1,
          Selling_Price: 1,
          Stock_Value: { $multiply: ['$Stock_qty', '$Cost_Price'] },
          Stock_Status: {
            $cond: {
              if: { $lte: ['$Stock_qty', 0] },
              then: 'Out of Stock',
              else: {
                $cond: {
                  if: { $lte: ['$Stock_qty', '$Reorder_level'] },
                  then: 'Low Stock',
                  else: 'Available'
                }
              }
            }
          }
        }
      },
      { $sort: { Batch_Number: 1 } }
    ];

    const list = await db.collection('batch_inventory').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/low-stock - Batches where Stock_qty <= Reorder_level
router.get('/low-stock', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $match: {
          $expr: { $lte: ['$Stock_qty', '$Reorder_level'] }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'Product_ID',
          foreignField: 'Product_ID',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Batch_Number: 1,
          Product_ID: 1,
          Product_Name: '$product.Name',
          Stock_qty: 1,
          Reorder_level: 1,
          Deficit: { $subtract: ['$Reorder_level', '$Stock_qty'] }
        }
      }
    ];
    const list = await db.collection('batch_inventory').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/healthy-stock - DA-2 Query 9: Stock_qty > Reorder_level
router.get('/healthy-stock', async (req, res) => {
  try {
    const db = getDB();
    const list = await db.collection('batch_inventory').find(
      { $expr: { $gt: ['$Stock_qty', '$Reorder_level'] } },
      { projection: { _id: 0, Batch_Number: 1, Product_ID: 1, Stock_qty: 1, Reorder_level: 1 } }
    ).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:batchNumber - Single batch
router.get('/:batchNumber', async (req, res) => {
  try {
    const db = getDB();
    const batchNo = parseInt(req.params.batchNumber, 10);
    const item = await db.collection('batch_inventory').findOne({ Batch_Number: batchNo });
    if (!item) return res.status(404).json({ error: `Batch ${batchNo} not found` });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory - Create new batch
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let {
      Batch_Number,
      Product_ID,
      Supplier_ID,
      Branch_ID,
      Mfg_date,
      Exp_date,
      Reorder_level,
      Stock_qty,
      Cost_Price,
      Selling_Price
    } = req.body;

    if (Product_ID === undefined) return res.status(400).json({ error: 'Product_ID is required' });
    if (Supplier_ID === undefined) return res.status(400).json({ error: 'Supplier_ID is required' });
    if (Branch_ID === undefined) return res.status(400).json({ error: 'Branch_ID is required' });
    if (Stock_qty === undefined) return res.status(400).json({ error: 'Stock_qty is required' });
    if (Cost_Price === undefined) return res.status(400).json({ error: 'Cost_Price is required' });
    if (Selling_Price === undefined) return res.status(400).json({ error: 'Selling_Price is required' });

    Product_ID = parseInt(Product_ID, 10);
    Supplier_ID = parseInt(Supplier_ID, 10);
    Branch_ID = parseInt(Branch_ID, 10);
    Stock_qty = parseInt(Stock_qty, 10);
    Cost_Price = parseFloat(Cost_Price);
    Selling_Price = parseFloat(Selling_Price);
    Reorder_level = Reorder_level !== undefined ? parseInt(Reorder_level, 10) : 15;

    // Verify foreign keys
    const product = await db.collection('products').findOne({ Product_ID });
    if (!product) return res.status(400).json({ error: `Product_ID ${Product_ID} does not exist.` });
    const supplier = await db.collection('suppliers').findOne({ Supplier_ID });
    if (!supplier) return res.status(400).json({ error: `Supplier_ID ${Supplier_ID} does not exist.` });
    const branch = await db.collection('branches').findOne({ Branch_ID });
    if (!branch) return res.status(400).json({ error: `Branch_ID ${Branch_ID} does not exist.` });

    if (!Batch_Number) {
      const last = await db.collection('batch_inventory').find().sort({ Batch_Number: -1 }).limit(1).toArray();
      Batch_Number = last.length > 0 ? last[0].Batch_Number + 1 : 501;
    } else {
      Batch_Number = parseInt(Batch_Number, 10);
    }

    const doc = {
      Batch_Number,
      Product_ID,
      Supplier_ID,
      Branch_ID,
      Mfg_date: Mfg_date || new Date().toISOString().split('T')[0],
      Exp_date: Exp_date || '2027-12-31',
      Reorder_level,
      Stock_qty,
      Cost_Price,
      Selling_Price
    };

    await db.collection('batch_inventory').insertOne(doc);
    res.status(201).json({ message: 'Batch created successfully', batch: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Batch_Number already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/inventory/:batchNumber - Update batch
router.put('/:batchNumber', async (req, res) => {
  try {
    const db = getDB();
    const batchNo = parseInt(req.params.batchNumber, 10);
    const {
      Stock_qty,
      Cost_Price,
      Selling_Price,
      Reorder_level,
      Mfg_date,
      Exp_date
    } = req.body;

    const updateFields = {};
    if (Stock_qty !== undefined) updateFields.Stock_qty = parseInt(Stock_qty, 10);
    if (Cost_Price !== undefined) updateFields.Cost_Price = parseFloat(Cost_Price);
    if (Selling_Price !== undefined) updateFields.Selling_Price = parseFloat(Selling_Price);
    if (Reorder_level !== undefined) updateFields.Reorder_level = parseInt(Reorder_level, 10);
    if (Mfg_date !== undefined) updateFields.Mfg_date = Mfg_date;
    if (Exp_date !== undefined) updateFields.Exp_date = Exp_date;

    const result = await db.collection('batch_inventory').updateOne(
      { Batch_Number: batchNo },
      { $set: updateFields }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: `Batch ${batchNo} not found` });

    const updated = await db.collection('batch_inventory').findOne({ Batch_Number: batchNo });
    res.json({ message: 'Batch updated successfully', batch: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/inventory/:batchNumber - Delete batch
router.delete('/:batchNumber', async (req, res) => {
  try {
    const db = getDB();
    const batchNo = parseInt(req.params.batchNumber, 10);

    const billUse = await db.collection('bills').countDocuments({ 'items.Batch_Number': batchNo });
    if (billUse > 0) return res.status(400).json({ error: `Cannot delete batch: referenced in ${billUse} bill(s).` });

    const returnUse = await db.collection('returns').countDocuments({ Batch_Number: batchNo });
    if (returnUse > 0) return res.status(400).json({ error: `Cannot delete batch: referenced in ${returnUse} return(s).` });

    const result = await db.collection('batch_inventory').deleteOne({ Batch_Number: batchNo });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Batch ${batchNo} not found` });
    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
