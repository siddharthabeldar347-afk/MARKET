const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { queries, queryCatalog } = require('../db/queries');

// GET /api/analytics/summary - Dashboard KPI metrics
router.get('/summary', async (req, res) => {
  try {
    const db = getDB();

    const [
      productCount,
      customerCount,
      employeeCount,
      batchCount,
      stockStats,
      revenueStats,
      lowStockCount
    ] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('customers').countDocuments(),
      db.collection('employees').countDocuments(),
      db.collection('batch_inventory').countDocuments(),
      db.collection('batch_inventory').aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: '$Stock_qty' },
            totalValue: { $sum: { $multiply: ['$Stock_qty', '$Cost_Price'] } }
          }
        }
      ]).toArray(),
      db.collection('bills').aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$Net_Amt' },
            totalDiscount: { $sum: '$Discount' },
            totalBills: { $sum: 1 }
          }
        }
      ]).toArray(),
      db.collection('batch_inventory').countDocuments({
        $expr: { $lte: ['$Stock_qty', '$Reorder_level'] }
      })
    ]);

    const stock = stockStats[0] || { totalStock: 0, totalValue: 0 };
    const revenue = revenueStats[0] || { totalRevenue: 0, totalDiscount: 0, totalBills: 0 };

    res.json({
      productCount,
      customerCount,
      employeeCount,
      batchCount,
      totalStock: stock.totalStock,
      inventoryValue: Number(stock.totalValue.toFixed(2)),
      totalRevenue: Number(revenue.totalRevenue.toFixed(2)),
      totalDiscount: Number(revenue.totalDiscount.toFixed(2)),
      totalBills: revenue.totalBills,
      lowStockCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/category-breakdown - DA-2 Query 12 & 13: Group by Category
router.get('/category-breakdown', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $group: {
          _id: '$Category_ID',
          Product_Count: { $sum: 1 },
          Avg_Price: { $avg: '$Base_Price' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: 'Category_ID',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Category_ID: '$_id',
          Category_Name: '$category.Category_Name',
          Product_Count: 1,
          Avg_Price: { $round: ['$Avg_Price', 2] }
        }
      },
      { $sort: { Category_ID: 1 } }
    ];

    const result = await db.collection('products').aggregate(pipeline).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/price-stats - DA-2 Query 15: Price statistics
router.get('/price-stats', async (req, res) => {
  try {
    const stats = await queries.sql15_priceStatistics();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/queries - Catalog of all 30 DA-2 queries (15 SQL + 15 PL/SQL)
router.get('/queries', (req, res) => {
  const catalogWithoutFuncs = queryCatalog.map(q => ({
    id: q.id,
    category: q.category,
    title: q.title,
    sql: q.sql,
    mongo: q.mongo
  }));
  res.json(catalogWithoutFuncs);
});

// POST /api/analytics/queries/run/:id - Execute an individual DA-2 query against MongoDB
router.post('/queries/run/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const queryEntry = queryCatalog.find(q => q.id === id);
    if (!queryEntry) return res.status(404).json({ error: `Query '${id}' not found in catalog` });

    const startTime = Date.now();
    const result = await queryEntry.run();
    const executionTimeMs = Date.now() - startTime;

    res.json({
      id: queryEntry.id,
      title: queryEntry.title,
      category: queryEntry.category,
      sql: queryEntry.sql,
      mongo: queryEntry.mongo,
      executionTimeMs,
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
