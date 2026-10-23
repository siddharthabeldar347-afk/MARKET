const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/bills - List bills with Customer and Employee names ($lookup JOIN)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $lookup: {
          from: 'customers',
          localField: 'Cust_ID',
          foreignField: 'Cust_ID',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'employees',
          localField: 'Emp_ID',
          foreignField: 'Emp_ID',
          as: 'employee'
        }
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Bill_No: 1,
          Cust_ID: 1,
          Customer_Name: '$customer.Name',
          Emp_ID: 1,
          Employee_Name: '$employee.Name',
          Time: 1,
          Gross_Amt: 1,
          Discount: 1,
          Net_Amt: 1,
          itemCount: { $size: { $ifNull: ['$items', []] } }
        }
      },
      { $sort: { Bill_No: -1 } }
    ];

    const list = await db.collection('bills').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bills/:billNo - Single bill with full item details ($lookup across products)
router.get('/:billNo', async (req, res) => {
  try {
    const db = getDB();
    const billNo = parseInt(req.params.billNo, 10);

    const pipeline = [
      { $match: { Bill_No: billNo } },
      {
        $lookup: {
          from: 'customers',
          localField: 'Cust_ID',
          foreignField: 'Cust_ID',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'employees',
          localField: 'Emp_ID',
          foreignField: 'Emp_ID',
          as: 'employee'
        }
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } }
    ];

    const bills = await db.collection('bills').aggregate(pipeline).toArray();
    if (bills.length === 0) return res.status(404).json({ error: `Bill #${billNo} not found` });

    const bill = bills[0];

    // Populate item product names
    const populatedItems = [];
    for (const item of bill.items) {
      const prod = await db.collection('products').findOne({ Product_ID: item.Product_ID });
      populatedItems.push({
        ...item,
        Product_Name: prod ? prod.Name : `Product #${item.Product_ID}`,
        Tax: prod ? prod.Tax : 0
      });
    }

    res.json({
      Bill_No: bill.Bill_No,
      Time: bill.Time,
      Cust_ID: bill.Cust_ID,
      Customer_Name: bill.customer ? bill.customer.Name : `Customer #${bill.Cust_ID}`,
      Customer_Phone: bill.customer ? bill.customer.Phn_No : '',
      Customer_Email: bill.customer ? bill.customer.Email : '',
      Emp_ID: bill.Emp_ID,
      Employee_Name: bill.employee ? bill.employee.Name : `Employee #${bill.Emp_ID}`,
      Gross_Amt: bill.Gross_Amt,
      Discount: bill.Discount,
      Net_Amt: bill.Net_Amt,
      items: populatedItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bills - Process POS Checkout with Atomic Stock Decrements
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Cust_ID, Emp_ID, items, Discount, Bill_No, Time } = req.body;

    if (!Cust_ID) return res.status(400).json({ error: 'Customer is required (Cust_ID).' });
    if (!Emp_ID) return res.status(400).json({ error: 'Cashier Employee is required (Emp_ID).' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Bill must contain at least one item.' });
    }

    Cust_ID = parseInt(Cust_ID, 10);
    Emp_ID = parseInt(Emp_ID, 10);
    const discountVal = Discount !== undefined ? Math.max(0, parseFloat(Discount)) : 0;

    // Verify Customer exists
    const customer = await db.collection('customers').findOne({ Cust_ID });
    if (!customer) return res.status(400).json({ error: `Customer #${Cust_ID} not found.` });

    // Verify Employee exists
    const employee = await db.collection('employees').findOne({ Emp_ID });
    if (!employee) return res.status(400).json({ error: `Employee #${Emp_ID} not found.` });

    // Validate inventory and prepare items
    const preparedItems = [];
    let grossTotal = 0;

    for (const rawItem of items) {
      const batchNo = parseInt(rawItem.Batch_Number, 10);
      const qty = parseInt(rawItem.Quantity_sold, 10);

      if (isNaN(batchNo) || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid Batch_Number and Quantity_sold > 0.' });
      }

      const batch = await db.collection('batch_inventory').findOne({ Batch_Number: batchNo });
      if (!batch) {
        return res.status(404).json({ error: `Batch #${batchNo} not found in inventory.` });
      }

      if (batch.Stock_qty < qty) {
        return res.status(400).json({
          error: `Insufficient stock for Batch #${batchNo} (${batch.Product_ID}). Available: ${batch.Stock_qty}, Requested: ${qty}`
        });
      }

      const sellingPrice = batch.Selling_Price;
      const subtotal = Number((qty * sellingPrice).toFixed(2));
      grossTotal += subtotal;

      preparedItems.push({
        Batch_Number: batchNo,
        Product_ID: batch.Product_ID,
        Quantity_sold: qty,
        UnitPrice: sellingPrice,
        Subtotal: subtotal
      });
    }

    grossTotal = Number(grossTotal.toFixed(2));
    const netTotal = Number(Math.max(0, grossTotal - discountVal).toFixed(2));

    // Determine Bill_No
    if (!Bill_No) {
      const last = await db.collection('bills').find().sort({ Bill_No: -1 }).limit(1).toArray();
      Bill_No = last.length > 0 ? last[0].Bill_No + 1 : 601;
    } else {
      Bill_No = parseInt(Bill_No, 10);
    }

    const billTime = Time || new Date().toISOString().split('T')[0];

    // Atomically decrement stock in batch_inventory
    for (const item of preparedItems) {
      const stockRes = await db.collection('batch_inventory').updateOne(
        { Batch_Number: item.Batch_Number, Stock_qty: { $gte: item.Quantity_sold } },
        { $inc: { Stock_qty: -item.Quantity_sold } }
      );
      if (stockRes.modifiedCount === 0) {
        throw new Error(`Stock deduction failed for Batch #${item.Batch_Number}. Another transaction may have depleted the stock.`);
      }
    }

    // Insert bill into bills collection
    const billDoc = {
      Bill_No,
      Cust_ID,
      Emp_ID,
      Time: billTime,
      Gross_Amt: grossTotal,
      Discount: discountVal,
      Net_Amt: netTotal,
      items: preparedItems.map(i => ({
        Batch_Number: i.Batch_Number,
        Product_ID: i.Product_ID,
        Quantity_sold: i.Quantity_sold,
        Subtotal: i.Subtotal
      }))
    };

    await db.collection('bills').insertOne(billDoc);

    // Also populate bill_items for relational compliance
    for (const item of preparedItems) {
      await db.collection('bill_items').insertOne({
        Bill_No,
        Batch_Number: item.Batch_Number,
        Product_ID: item.Product_ID,
        Quantity_sold: item.Quantity_sold,
        Subtotal: item.Subtotal
      });
    }

    res.status(201).json({
      message: 'Bill created and stock updated successfully',
      bill: {
        ...billDoc,
        Customer_Name: customer.Name,
        Employee_Name: employee.Name,
        detailedItems: preparedItems
      }
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Bill_No already exists' });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
