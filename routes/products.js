const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/products - List products with category lookup and filters
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const match = {};

    if (req.query.search) {
      match.Name = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.category_id) {
      match.Category_ID = parseInt(req.query.category_id, 10);
    }
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      match.Base_Price = {};
      if (req.query.minPrice !== undefined) match.Base_Price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice !== undefined) match.Base_Price.$lte = parseFloat(req.query.maxPrice);
    }

    const sort = {};
    if (req.query.sortBy === 'price_asc') sort.Base_Price = 1;
    else if (req.query.sortBy === 'price_desc') sort.Base_Price = -1;
    else if (req.query.sortBy === 'name') sort.Name = 1;
    else sort.Product_ID = 1;

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'categories',
          localField: 'Category_ID',
          foreignField: 'Category_ID',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          Product_ID: 1,
          Name: 1,
          Category_ID: 1,
          Category_Name: '$category.Category_Name',
          Base_Price: 1,
          Tax: 1,
          Price_With_Tax: {
            $round: [{ $add: ['$Base_Price', { $multiply: ['$Base_Price', { $divide: ['$Tax', 100] }] }] }, 2]
          },
          Price_Category: {
            $cond: { if: { $gt: ['$Base_Price', 100] }, then: 'EXPENSIVE', else: 'NORMAL' }
          }
        }
      },
      { $sort: sort }
    ];

    const list = await db.collection('products').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id - Single product
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const pipeline = [
      { $match: { Product_ID: id } },
      {
        $lookup: {
          from: 'categories',
          localField: 'Category_ID',
          foreignField: 'Category_ID',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Product_ID: 1,
          Name: 1,
          Category_ID: 1,
          Category_Name: '$category.Category_Name',
          Base_Price: 1,
          Tax: 1,
          Price_With_Tax: {
            $round: [{ $add: ['$Base_Price', { $multiply: ['$Base_Price', { $divide: ['$Tax', 100] }] }] }, 2]
          },
          Price_Category: {
            $cond: { if: { $gt: ['$Base_Price', 100] }, then: 'EXPENSIVE', else: 'NORMAL' }
          }
        }
      }
    ];

    const items = await db.collection('products').aggregate(pipeline).toArray();
    if (items.length === 0) return res.status(404).json({ error: `Product ${id} not found` });
    res.json(items[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products - Create product
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Product_ID, Name, Category_ID, Base_Price, Tax } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    if (Category_ID === undefined) return res.status(400).json({ error: 'Category_ID is required' });
    if (Base_Price === undefined) return res.status(400).json({ error: 'Base_Price is required' });

    Category_ID = parseInt(Category_ID, 10);
    Base_Price = parseFloat(Base_Price);
    Tax = Tax !== undefined ? parseFloat(Tax) : 5.0;

    // Verify category exists
    const cat = await db.collection('categories').findOne({ Category_ID });
    if (!cat) return res.status(400).json({ error: `Category_ID ${Category_ID} does not exist.` });

    if (!Product_ID) {
      const last = await db.collection('products').find().sort({ Product_ID: -1 }).limit(1).toArray();
      Product_ID = last.length > 0 ? last[0].Product_ID + 1 : 301;
    } else {
      Product_ID = parseInt(Product_ID, 10);
    }

    const doc = { Product_ID, Name: String(Name).trim(), Category_ID, Base_Price, Tax };
    await db.collection('products').insertOne(doc);
    res.status(201).json({ message: 'Product created successfully', product: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Product_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Name, Category_ID, Base_Price, Tax } = req.body;

    const updateFields = {};
    if (Name !== undefined) updateFields.Name = String(Name).trim();
    if (Category_ID !== undefined) {
      const catId = parseInt(Category_ID, 10);
      const cat = await db.collection('categories').findOne({ Category_ID: catId });
      if (!cat) return res.status(400).json({ error: `Category_ID ${catId} does not exist.` });
      updateFields.Category_ID = catId;
    }
    if (Base_Price !== undefined) updateFields.Base_Price = parseFloat(Base_Price);
    if (Tax !== undefined) updateFields.Tax = parseFloat(Tax);

    const result = await db.collection('products').updateOne({ Product_ID: id }, { $set: updateFields });
    if (result.matchedCount === 0) return res.status(404).json({ error: `Product ${id} not found` });

    const updated = await db.collection('products').findOne({ Product_ID: id }, { projection: { _id: 0 } });
    res.json({ message: 'Product updated successfully', product: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/products/:id/increase-price - DA-2 PL/SQL 15: Increase price by percentage
router.patch('/:id/increase-price', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const percentage = parseFloat(req.body.percentage || 10);

    const p = await db.collection('products').findOne({ Product_ID: id });
    if (!p) return res.status(404).json({ error: `Product ${id} not found` });

    const newPrice = Number((p.Base_Price + (p.Base_Price * percentage / 100)).toFixed(2));
    await db.collection('products').updateOne({ Product_ID: id }, { $set: { Base_Price: newPrice } });

    res.json({
      message: `Price increased by ${percentage}%.`,
      Product_ID: id,
      Old_Price: p.Base_Price,
      New_Price: newPrice
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const batchCount = await db.collection('batch_inventory').countDocuments({ Product_ID: id });
    if (batchCount > 0) return res.status(400).json({ error: `Cannot delete product: ${batchCount} inventory batch(es) reference this product.` });

    const result = await db.collection('products').deleteOne({ Product_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Product ${id} not found` });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
