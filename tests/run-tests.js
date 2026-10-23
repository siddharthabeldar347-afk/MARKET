// Comprehensive Automated Integration Test Runner
// Verifies all features, validation schemas, transactions, and DA-2 query translations
const { connectDB, closeDB, getDB } = require('../db/connection');
const { seedDatabase } = require('../db/seed');
const { queries, queryCatalog } = require('../db/queries');

let passedTests = 0;
let failedTests = 0;
const testLogs = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
    testLogs.push({ status: 'PASS', name: testName, details });
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    testLogs.push({ status: 'FAIL', name: testName, details });
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('   RUNNING AUTOMATED TEST SUITE: SUPERMARKET                   ');
  console.log('===============================================================');

  const db = await connectDB();

  // Test Group 1: Reseed and Verify Initial Data
  console.log('\n[1/6] Testing Database Seeding & Schema Integrity...');
  await seedDatabase();

  const collections = ['categories', 'suppliers', 'branches', 'customers', 'products', 'employees', 'batch_inventory', 'bills', 'bill_items', 'returns', 'employs'];
  for (const c of collections) {
    const count = await db.collection(c).countDocuments();
    assert(count >= 5, `Collection '${c}' contains seed records`, `Count = ${count}`);
  }

  // Test Group 2: $jsonSchema Validation Rules
  console.log('\n[2/6] Testing MongoDB $jsonSchema Validation Constraints...');
  try {
    // Attempt inserting category with missing Category_Name (violates $jsonSchema)
    await db.collection('categories').insertOne({ Category_ID: 999 });
    assert(false, 'Schema validation rejected category without Category_Name', 'Document was incorrectly allowed');
  } catch (err) {
    assert(true, 'Schema validation correctly rejected category without Category_Name', err.message);
  }

  try {
    // Attempt inserting batch_inventory with negative stock (violates minimum: 0)
    await db.collection('batch_inventory').insertOne({
      Batch_Number: 999,
      Product_ID: 301,
      Supplier_ID: 101,
      Branch_ID: 1,
      Stock_qty: -10,
      Cost_Price: 50,
      Selling_Price: 60
    });
    assert(false, 'Schema validation rejected negative stock quantity', 'Document was incorrectly allowed');
  } catch (err) {
    assert(true, 'Schema validation correctly rejected negative stock quantity', err.message);
  }

  // Test Group 3: CRUD Operations
  console.log('\n[3/6] Testing CRUD Operations...');
  // Create Category
  const newCat = { Category_ID: 10, Category_Name: 'Bakery & Sweets' };
  await db.collection('categories').insertOne(newCat);
  const foundCat = await db.collection('categories').findOne({ Category_ID: 10 });
  assert(foundCat && foundCat.Category_Name === 'Bakery & Sweets', 'Create & Read Category');

  // Update Category
  await db.collection('categories').updateOne({ Category_ID: 10 }, { $set: { Category_Name: 'Fresh Bakery' } });
  const updatedCat = await db.collection('categories').findOne({ Category_ID: 10 });
  assert(updatedCat.Category_Name === 'Fresh Bakery', 'Update Category');

  // Delete Category
  await db.collection('categories').deleteOne({ Category_ID: 10 });
  const deletedCat = await db.collection('categories').findOne({ Category_ID: 10 });
  assert(deletedCat === null, 'Delete Category');

  // Create Product & Verify $lookup join
  const newProd = { Product_ID: 399, Name: 'Organic Oats', Category_ID: 1, Base_Price: 95.0, Tax: 5.0 };
  await db.collection('products').insertOne(newProd);
  const prodLookup = await db.collection('products').aggregate([
    { $match: { Product_ID: 399 } },
    { $lookup: { from: 'categories', localField: 'Category_ID', foreignField: 'Category_ID', as: 'cat' } },
    { $unwind: '$cat' }
  ]).toArray();
  assert(prodLookup.length > 0 && prodLookup[0].cat.Category_Name === 'Grocery', 'Create Product and join with Category');
  await db.collection('products').deleteOne({ Product_ID: 399 });

  // Test Group 4: Billing with Embedded Items & Atomic Stock Decrement
  console.log('\n[4/6] Testing POS Billing & Atomic Stock Decrements...');
  const batch501Before = await db.collection('batch_inventory').findOne({ Batch_Number: 501 });
  const initialStock = batch501Before.Stock_qty;
  const quantityToBuy = 5;

  // Perform bill transaction
  const billNo = 699;
  const gross = quantityToBuy * batch501Before.Selling_Price;
  const discount = 15.0;
  const net = gross - discount;

  // Atomic decrement
  const decRes = await db.collection('batch_inventory').updateOne(
    { Batch_Number: 501, Stock_qty: { $gte: quantityToBuy } },
    { $inc: { Stock_qty: -quantityToBuy } }
  );
  assert(decRes.modifiedCount === 1, 'Stock decrement atomically succeeded');

  const billDoc = {
    Bill_No: billNo,
    Cust_ID: 201,
    Emp_ID: 401,
    Time: '2026-10-19',
    Gross_Amt: gross,
    Discount: discount,
    Net_Amt: net,
    items: [
      {
        Batch_Number: 501,
        Product_ID: batch501Before.Product_ID,
        Quantity_sold: quantityToBuy,
        Subtotal: gross
      }
    ]
  };
  await db.collection('bills').insertOne(billDoc);

  const batch501After = await db.collection('batch_inventory').findOne({ Batch_Number: 501 });
  assert(batch501After.Stock_qty === initialStock - quantityToBuy, `Inventory stock reduced from ${initialStock} to ${batch501After.Stock_qty}`);

  // Test Out-of-Stock constraint
  const excessiveQty = batch501After.Stock_qty + 1000;
  const outOfStockRes = await db.collection('batch_inventory').updateOne(
    { Batch_Number: 501, Stock_qty: { $gte: excessiveQty } },
    { $inc: { Stock_qty: -excessiveQty } }
  );
  assert(outOfStockRes.modifiedCount === 0, 'Excessive purchase rejected due to insufficient stock');

  // Test Group 5: Returns & Restocking
  console.log('\n[5/6] Testing Returns & Stock Restoration...');
  const returnQty = 2;
  const stockBeforeReturn = batch501After.Stock_qty;

  // Process return
  await db.collection('batch_inventory').updateOne(
    { Batch_Number: 501 },
    { $inc: { Stock_qty: returnQty } }
  );
  await db.collection('returns').insertOne({
    Return_ID: 799,
    Return_date: '2026-10-19',
    Batch_Number: 501,
    Quantity_returned: returnQty,
    Reason: 'Overpurchased'
  });

  const stockAfterReturn = await db.collection('batch_inventory').findOne({ Batch_Number: 501 });
  assert(stockAfterReturn.Stock_qty === stockBeforeReturn + returnQty, `Stock restored on return: ${stockBeforeReturn} + ${returnQty} = ${stockAfterReturn.Stock_qty}`);

  // Clean up test bill and return records
  await db.collection('bills').deleteOne({ Bill_No: billNo });
  await db.collection('returns').deleteOne({ Return_ID: 799 });
  // Restore initial stock for clean query testing
  await db.collection('batch_inventory').updateOne({ Batch_Number: 501 }, { $set: { Stock_qty: initialStock } });

  // Test Group 6: Verification of all 15 SQL + 15 PL/SQL MongoDB Implementations
  console.log('\n[6/6] Testing All 15 DA-2 SQL & 15 PL/SQL Equivalent Queries...');

  // SQL 1: Base_Price > 50
  const sql1 = await queries.sql1_priceGreaterThan50();
  assert(sql1.length === 4 && sql1.every(p => p.Base_Price > 50), 'SQL 1: Products where Base_Price > 50');

  // SQL 2: Base_Price between 50 and 150
  const sql2 = await queries.sql2_priceBetween50And150();
  assert(sql2.length === 4 && sql2.every(p => p.Base_Price >= 50 && p.Base_Price <= 150), 'SQL 2: Products where Base_Price between 50 and 150');

  // SQL 3: Customer name like 'K%'
  const sql3 = await queries.sql3_customerNameStartsWithK();
  assert(sql3.length === 2 && sql3.every(c => c.Name.startsWith('K')), "SQL 3: Customers starting with 'K'");

  // SQL 4: Sort by Base_Price ASC
  const sql4 = await queries.sql4_productsOrderByPriceAsc();
  assert(sql4[0].Base_Price <= sql4[sql4.length - 1].Base_Price, 'SQL 4: Products sorted by price ASC');

  // SQL 5: Total stock SUM
  const sql5 = await queries.sql5_totalStockQuantity();
  assert(sql5.Total_Stock === 480, `SQL 5: Total stock SUM = 480 (Got: ${sql5.Total_Stock})`);

  // SQL 6: Employee JOIN Branch
  const sql6 = await queries.sql6_employeeBranchJoin();
  assert(sql6.length === 5 && sql6[0].Location !== undefined, 'SQL 6: Employee $lookup Branch');

  // SQL 7: Product JOIN Category
  const sql7 = await queries.sql7_productCategoryJoin();
  assert(sql7.length === 5 && sql7[0].Category_Name !== undefined, 'SQL 7: Product $lookup Category');

  // SQL 8: Bill JOIN Customer
  const sql8 = await queries.sql8_billCustomerJoin();
  assert(sql8.length === 5 && sql8[0].Customer_Name !== undefined, 'SQL 8: Bill $lookup Customer');

  // SQL 9: Stock_qty > Reorder_level
  const sql9 = await queries.sql9_stockGreaterThanReorder();
  assert(sql9.length === 5, 'SQL 9: Batches with Stock > Reorder level');

  // SQL 10: Full multi-join
  const sql10 = await queries.sql10_fullBillTransactionJoin();
  assert(sql10.length === 5 && sql10[0].Customer_Name && sql10[0].Product_Name, 'SQL 10: Multi-table Join for Bill Items');

  // SQL 11: Update customer phone
  const sql11 = await queries.sql11_updateCustomerPhone(205, '9888888888');
  assert(sql11.customer.Phn_No === '9888888888', 'SQL 11: Update customer phone number');

  // SQL 12: Group by category count
  const sql12 = await queries.sql12_productCountByCategory();
  assert(sql12.length === 5 && sql12.every(c => c.Product_Count >= 1), 'SQL 12: Product count grouped by Category');

  // SQL 13: Group by category having count >= 1
  const sql13 = await queries.sql13_categoriesHavingCountGe1();
  assert(sql13.length === 5, 'SQL 13: Categories having product count >= 1');

  // SQL 14: Highest base price product
  const sql14 = await queries.sql14_highestBasePriceProduct();
  assert(sql14.length > 0 && sql14[0].Base_Price === 150.0, 'SQL 14: Product with maximum base price (150)');

  // SQL 15: Price statistics (SUM, AVG, MAX, MIN)
  const sql15 = await queries.sql15_priceStatistics();
  assert(sql15.Total_Price === 440 && sql15.Average_Price === 88 && sql15.Maximum_Price === 150 && sql15.Minimum_Price === 30, 'SQL 15: Price aggregates (SUM=440, AVG=88, MAX=150, MIN=30)');

  // PL/SQL 1: Calculate total stock using cursor loop
  const plsql1 = await queries.plsql1_calculateStockLoop();
  assert(plsql1.Total_Stock === 480, `PL/SQL 1: Cursor loop total stock = 480 (Got: ${plsql1.Total_Stock})`);

  // PL/SQL 2: Discounted price function
  const plsql2 = queries.plsql2_discountedPrice(1000, 10);
  assert(plsql2.Final_Price === 900, `PL/SQL 2: Discounted price of 1000 with 10% = 900 (Got: ${plsql2.Final_Price})`);

  // PL/SQL 3: Highest product price
  const plsql3 = await queries.plsql3_highestProductPrice();
  assert(plsql3.Highest_Price === 150, `PL/SQL 3: Highest product price = 150 (Got: ${plsql3.Highest_Price})`);

  // PL/SQL 4: Get bill amount
  const plsql4 = await queries.plsql4_getBillAmount(601);
  assert(plsql4.Net_Amount === 480, `PL/SQL 4: Bill #601 Net Amount = 480 (Got: ${plsql4.Net_Amount})`);

  // PL/SQL 5: Check stock function
  const plsql5 = await queries.plsql5_checkStock(501);
  assert(plsql5.Stock_Status === 'Available', 'PL/SQL 5: Stock check status for batch 501 = Available');

  // PL/SQL 6: Display products procedure
  const plsql6 = await queries.plsql6_displayProducts();
  assert(plsql6.formattedLines.length === 5, 'PL/SQL 6: Display products formatted output generated');

  // PL/SQL 7: Update product price procedure
  const plsql7 = await queries.plsql7_updateProductPrice(301, 65);
  assert(plsql7.product.Base_Price === 65, 'PL/SQL 7: Update product price procedure (301 to 65)');
  await db.collection('products').updateOne({ Product_ID: 301 }, { $set: { Base_Price: 60.0 } }); // reset

  // PL/SQL 8: Customer details procedure
  const plsql8 = await queries.plsql8_customerDetails(201);
  assert(plsql8.Name === 'Kumara Priya', 'PL/SQL 8: Customer details procedure (Cust_ID 201)');

  // PL/SQL 9: Explicit cursor customers
  const plsql9 = await queries.plsql9_cursorCustomers();
  assert(plsql9.length === 5, 'PL/SQL 9: Explicit cursor over customers');

  // PL/SQL 10: Cursor products with category
  const plsql10 = await queries.plsql10_cursorProductCategories();
  assert(plsql10.length === 5, 'PL/SQL 10: Cursor products with category join');

  // PL/SQL 11: Stock value function (Stock_qty * Cost_Price)
  const plsql11 = await queries.plsql11_stockValue(501);
  assert(plsql11.Stock_Value === 5000, `PL/SQL 11: Stock value for batch 501 = 5000 (Got: ${plsql11.Stock_Value})`);

  // PL/SQL 12: Price with tax function
  const plsql12 = await queries.plsql12_priceWithTax(301);
  assert(plsql12.Price_With_Tax === 63, `PL/SQL 12: Price with tax for product 301 (60 + 5% = 63) (Got: ${plsql12.Price_With_Tax})`);

  // PL/SQL 13: Total items sold in bill function
  const plsql13 = await queries.plsql13_totalItemsSold(601);
  assert(plsql13.Total_Items === 5, `PL/SQL 13: Total items sold in Bill #601 = 5 (Got: ${plsql13.Total_Items})`);

  // PL/SQL 14: Price category function (>100 EXPENSIVE else NORMAL)
  const plsql14 = await queries.plsql14_priceCategory(304);
  assert(plsql14.Price_Category === 'EXPENSIVE', 'PL/SQL 14: Price category for product 304 = EXPENSIVE');

  // PL/SQL 15: Increase price by percentage procedure
  const plsql15 = await queries.plsql15_increasePrice(301, 10);
  assert(plsql15.New_Price === 66, `PL/SQL 15: Increase price of 301 by 10% (60 -> 66) (Got: ${plsql15.New_Price})`);
  await db.collection('products').updateOne({ Product_ID: 301 }, { $set: { Base_Price: 60.0 } }); // reset

  console.log('\n===============================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================');

  await closeDB();
  return { passedTests, failedTests, testLogs };
}

if (require.main === module) {
  runTestSuite()
    .then(summary => {
      if (summary.failedTests > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(err => {
      console.error('Fatal Test Runner Error:', err);
      process.exit(1);
    });
}

module.exports = { runTestSuite };
