// DA-2 SQL & PL/SQL queries mapped to MongoDB queries & Aggregation Pipelines
// Official MongoDB Node.js driver implementation
const { getDB } = require('./connection');

const queries = {
  // ==========================================
  // SQL OPERATIONS (1 to 15)
  // ==========================================

  // 1. Products with Base_Price > 50
  async sql1_priceGreaterThan50() {
    const db = getDB();
    return db.collection('products')
      .find({ Base_Price: { $gt: 50 } }, { projection: { _id: 0, Name: 1, Base_Price: 1 } })
      .toArray();
  },

  // 2. Products with Base_Price between 50 and 150
  async sql2_priceBetween50And150() {
    const db = getDB();
    return db.collection('products')
      .find(
        { Base_Price: { $gte: 50, $lte: 150 } },
        { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } }
      )
      .toArray();
  },

  // 3. Customers whose name starts with 'K'
  async sql3_customerNameStartsWithK() {
    const db = getDB();
    return db.collection('customers')
      .find({ Name: { $regex: '^K', $options: 'i' } }, { projection: { _id: 0 } })
      .toArray();
  },

  // 4. Products in ascending order of price
  async sql4_productsOrderByPriceAsc() {
    const db = getDB();
    return db.collection('products')
      .find({}, { projection: { _id: 0, Name: 1, Base_Price: 1 } })
      .sort({ Base_Price: 1 })
      .toArray();
  },

  // 5. Total quantity of stock available across all batches
  async sql5_totalStockQuantity() {
    const db = getDB();
    const res = await db.collection('batch_inventory').aggregate([
      { $group: { _id: null, Total_Stock: { $sum: '$Stock_qty' } } },
      { $project: { _id: 0, Total_Stock: 1 } }
    ]).toArray();
    return res[0] || { Total_Stock: 0 };
  },

  // 6. Employee name along with branch location ($lookup JOIN)
  async sql6_employeeBranchJoin() {
    const db = getDB();
    return db.collection('employees').aggregate([
      {
        $lookup: {
          from: 'branches',
          localField: 'Branch_ID',
          foreignField: 'Branch_ID',
          as: 'branch'
        }
      },
      { $unwind: '$branch' },
      {
        $project: {
          _id: 0,
          Name: '$Name',
          Location: '$branch.Location'
        }
      }
    ]).toArray();
  },

  // 7. Product name along with category name ($lookup JOIN)
  async sql7_productCategoryJoin() {
    const db = getDB();
    return db.collection('products').aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'Category_ID',
          foreignField: 'Category_ID',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          Product_Name: '$Name',
          Category_Name: '$category.Category_Name'
        }
      }
    ]).toArray();
  },

  // 8. Bill number, customer name, gross amount, and net amount ($lookup JOIN)
  async sql8_billCustomerJoin() {
    const db = getDB();
    return db.collection('bills').aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'Cust_ID',
          foreignField: 'Cust_ID',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          Bill_No: 1,
          Customer_Name: '$customer.Name',
          Gross_Amt: 1,
          Net_Amt: 1
        }
      }
    ]).toArray();
  },

  // 9. Batches where current stock > reorder level ($expr)
  async sql9_stockGreaterThanReorder() {
    const db = getDB();
    return db.collection('batch_inventory').find(
      { $expr: { $gt: ['$Stock_qty', '$Reorder_level'] } },
      { projection: { _id: 0, Batch_Number: 1, Product_ID: 1, Stock_qty: 1, Reorder_level: 1 } }
    ).toArray();
  },

  // 10. Multi-table Join: Bill, Customer, Employee, Items, Product
  async sql10_fullBillTransactionJoin() {
    const db = getDB();
    return db.collection('bills').aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'Cust_ID',
          foreignField: 'Cust_ID',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $lookup: {
          from: 'employees',
          localField: 'Emp_ID',
          foreignField: 'Emp_ID',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.Product_ID',
          foreignField: 'Product_ID',
          as: 'prod'
        }
      },
      { $unwind: '$prod' },
      {
        $project: {
          _id: 0,
          Bill_No: 1,
          Customer_Name: '$customer.Name',
          Employee_Name: '$employee.Name',
          Product_Name: '$prod.Name',
          Quantity_sold: '$items.Quantity_sold',
          Subtotal: '$items.Subtotal'
        }
      }
    ]).toArray();
  },

  // 11. Update customer phone number
  async sql11_updateCustomerPhone(custId = 205, newPhone = '9888888888') {
    const db = getDB();
    const result = await db.collection('customers').updateOne(
      { Cust_ID: custId },
      { $set: { Phn_No: newPhone } }
    );
    const updated = await db.collection('customers').findOne({ Cust_ID: custId }, { projection: { _id: 0 } });
    return { modifiedCount: result.modifiedCount, customer: updated };
  },

  // 12. Count of products in each category (GROUP BY)
  async sql12_productCountByCategory() {
    const db = getDB();
    return db.collection('products').aggregate([
      { $group: { _id: '$Category_ID', Product_Count: { $sum: 1 } } },
      { $project: { _id: 0, Category_ID: '$_id', Product_Count: 1 } },
      { $sort: { Category_ID: 1 } }
    ]).toArray();
  },

  // 13. Categories having count >= 1 (HAVING COUNT >= 1)
  async sql13_categoriesHavingCountGe1() {
    const db = getDB();
    return db.collection('products').aggregate([
      { $group: { _id: '$Category_ID', Product_Count: { $sum: 1 } } },
      { $match: { Product_Count: { $gte: 1 } } },
      { $project: { _id: 0, Category_ID: '$_id', Product_Count: 1 } },
      { $sort: { Category_ID: 1 } }
    ]).toArray();
  },

  // 14. Product with highest base price (Subquery / Sort & Limit)
  async sql14_highestBasePriceProduct() {
    const db = getDB();
    return db.collection('products')
      .find({}, { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } })
      .sort({ Base_Price: -1 })
      .limit(1)
      .toArray();
  },

  // 15. Aggregates: Total, Average, Maximum, and Minimum base price
  async sql15_priceStatistics() {
    const db = getDB();
    const res = await db.collection('products').aggregate([
      {
        $group: {
          _id: null,
          Total_Price: { $sum: '$Base_Price' },
          Average_Price: { $avg: '$Base_Price' },
          Maximum_Price: { $max: '$Base_Price' },
          Minimum_Price: { $min: '$Base_Price' }
        }
      },
      { $project: { _id: 0 } }
    ]).toArray();
    return res[0] || {};
  },

  // ==========================================
  // PL/SQL OPERATIONS (1 to 15)
  // ==========================================

  // 1. Calculate total stock using a loop (Cursor iteration)
  async plsql1_calculateStockLoop() {
    const db = getDB();
    let total_stock = 0;
    const cursor = db.collection('batch_inventory').find({}, { projection: { Stock_qty: 1 } });
    for await (const doc of cursor) {
      total_stock += (doc.Stock_qty || 0);
    }
    return { Total_Stock: total_stock, Message: `Total Stock = ${total_stock}` };
  },

  // 2. Function to calculate discounted price
  plsql2_discountedPrice(price = 1000, discount = 10) {
    const finalPrice = price - (price * discount / 100);
    return { Original_Price: price, Discount_Percent: discount, Final_Price: finalPrice };
  },

  // 3. Function to find highest product price
  async plsql3_highestProductPrice() {
    const db = getDB();
    const doc = await db.collection('products')
      .find({}, { projection: { _id: 0, Base_Price: 1 } })
      .sort({ Base_Price: -1 })
      .limit(1)
      .next();
    return { Highest_Price: doc ? doc.Base_Price : 0 };
  },

  // 4. Function to get total bill amount
  async plsql4_getBillAmount(billNo = 601) {
    const db = getDB();
    const bill = await db.collection('bills').findOne({ Bill_No: billNo }, { projection: { _id: 0, Net_Amt: 1 } });
    return { Bill_No: billNo, Net_Amount: bill ? bill.Net_Amt : 0 };
  },

  // 5. Function to check stock availability
  async plsql5_checkStock(batchNo = 501) {
    const db = getDB();
    const batch = await db.collection('batch_inventory').findOne({ Batch_Number: batchNo }, { projection: { _id: 0, Stock_qty: 1 } });
    const qty = batch ? batch.Stock_qty : 0;
    const status = qty > 0 ? 'Available' : 'Out of Stock';
    return { Batch_Number: batchNo, Stock_qty: qty, Stock_Status: status };
  },

  // 6. Procedure to display all products
  async plsql6_displayProducts() {
    const db = getDB();
    const list = await db.collection('products').find({}, { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } }).toArray();
    const lines = list.map(r => `ID: ${r.Product_ID} Name: ${r.Name} Price: ${r.Base_Price}`);
    return { products: list, formattedLines: lines };
  },

  // 7. Procedure to update product price
  async plsql7_updateProductPrice(productId = 301, newPrice = 65) {
    const db = getDB();
    await db.collection('products').updateOne({ Product_ID: productId }, { $set: { Base_Price: newPrice } });
    const updated = await db.collection('products').findOne({ Product_ID: productId }, { projection: { _id: 0 } });
    return { Message: 'Product price updated successfully.', product: updated };
  },

  // 8. Procedure to display customer details
  async plsql8_customerDetails(custId = 201) {
    const db = getDB();
    const c = await db.collection('customers').findOne({ Cust_ID: custId }, { projection: { _id: 0 } });
    return c || { error: 'Customer not found' };
  },

  // 9. Display all customers using an explicit cursor
  async plsql9_cursorCustomers() {
    const db = getDB();
    const results = [];
    const cursor = db.collection('customers').find({}, { projection: { _id: 0, Name: 1, Phn_No: 1 } });
    for await (const row of cursor) {
      results.push({ Name: row.Name, Phone: row.Phn_No, Output: `Name: ${row.Name} Phone: ${row.Phn_No}` });
    }
    return results;
  },

  // 10. Display products with their category names using a cursor
  async plsql10_cursorProductCategories() {
    const db = getDB();
    return db.collection('products').aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'Category_ID',
          foreignField: 'Category_ID',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          Name: 1,
          Category_Name: '$category.Category_Name',
          Output: { $concat: ['Product: ', '$Name', ' Category: ', '$category.Category_Name'] }
        }
      }
    ]).toArray();
  },

  // 11. Find the total value of stock for a batch (Stock_qty * Cost_Price)
  async plsql11_stockValue(batchNo = 501) {
    const db = getDB();
    const b = await db.collection('batch_inventory').findOne({ Batch_Number: batchNo }, { projection: { _id: 0, Stock_qty: 1, Cost_Price: 1 } });
    const stockVal = b ? (b.Stock_qty * b.Cost_Price) : 0;
    return { Batch_Number: batchNo, Stock_Value: stockVal };
  },

  // 12. Calculate selling price after tax: Base_Price + (Base_Price * Tax / 100)
  async plsql12_priceWithTax(productId = 301) {
    const db = getDB();
    const p = await db.collection('products').findOne({ Product_ID: productId }, { projection: { _id: 0, Base_Price: 1, Tax: 1 } });
    if (!p) return { error: 'Product not found' };
    const priceWithTax = p.Base_Price + (p.Base_Price * p.Tax / 100);
    return { Product_ID: productId, Base_Price: p.Base_Price, Tax_Percent: p.Tax, Price_With_Tax: priceWithTax };
  },

  // 13. Find the total number of items sold in a bill
  async plsql13_totalItemsSold(billNo = 601) {
    const db = getDB();
    const bill = await db.collection('bills').findOne({ Bill_No: billNo });
    let totalItems = 0;
    if (bill && Array.isArray(bill.items)) {
      totalItems = bill.items.reduce((sum, item) => sum + (item.Quantity_sold || 0), 0);
    }
    return { Bill_No: billNo, Total_Items: totalItems };
  },

  // 14. Function that returns 'EXPENSIVE' if base price > 100 else 'NORMAL'
  async plsql14_priceCategory(productId = 301) {
    const db = getDB();
    const p = await db.collection('products').findOne({ Product_ID: productId }, { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } });
    if (!p) return { error: 'Product not found' };
    const category = p.Base_Price > 100 ? 'EXPENSIVE' : 'NORMAL';
    return { Product_ID: p.Product_ID, Name: p.Name, Base_Price: p.Base_Price, Price_Category: category };
  },

  // 15. Procedure to increase product base price by a percentage
  async plsql15_increasePrice(productId = 301, percentage = 10) {
    const db = getDB();
    const p = await db.collection('products').findOne({ Product_ID: productId });
    if (!p) return { error: 'Product not found' };
    const newPrice = Number((p.Base_Price + (p.Base_Price * percentage / 100)).toFixed(2));
    await db.collection('products').updateOne({ Product_ID: productId }, { $set: { Base_Price: newPrice } });
    const updated = await db.collection('products').findOne({ Product_ID: productId }, { projection: { _id: 0 } });
    return { Message: 'Price updated successfully.', Product_ID: productId, Old_Price: p.Base_Price, New_Price: newPrice, Product: updated };
  }
};

// Metadata for the UI Lab Demonstration / Viva Explorer
const queryCatalog = [
  {
    id: 'sql1',
    category: 'SQL Query',
    title: '1. Filter Products by Price > 50',
    sql: 'SELECT Name, Base_Price FROM Product WHERE Base_Price > 50;',
    mongo: "db.products.find({ Base_Price: { $gt: 50 } }, { projection: { _id: 0, Name: 1, Base_Price: 1 } })",
    run: queries.sql1_priceGreaterThan50
  },
  {
    id: 'sql2',
    category: 'SQL Query',
    title: '2. Filter Products by Price Between 50 and 150',
    sql: 'SELECT Product_ID, Name, Base_Price FROM Product WHERE Base_Price BETWEEN 50 AND 150;',
    mongo: "db.products.find({ Base_Price: { $gte: 50, $lte: 150 } }, { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } })",
    run: queries.sql2_priceBetween50And150
  },
  {
    id: 'sql3',
    category: 'SQL Query',
    title: "3. Filter Customers with Name Starting with 'K'",
    sql: "SELECT * FROM Customer WHERE Name LIKE 'K%';",
    mongo: "db.customers.find({ Name: { $regex: '^K', $options: 'i' } })",
    run: queries.sql3_customerNameStartsWithK
  },
  {
    id: 'sql4',
    category: 'SQL Query',
    title: '4. Sort Products by Base_Price Ascending',
    sql: 'SELECT Name, Base_Price FROM Product ORDER BY Base_Price ASC;',
    mongo: "db.products.find({}, { projection: { _id: 0, Name: 1, Base_Price: 1 } }).sort({ Base_Price: 1 })",
    run: queries.sql4_productsOrderByPriceAsc
  },
  {
    id: 'sql5',
    category: 'SQL Aggregation',
    title: '5. Total Quantity of Stock (SUM)',
    sql: 'SELECT SUM(Stock_qty) AS Total_Stock FROM Batch_Inventory;',
    mongo: "db.batch_inventory.aggregate([{ $group: { _id: null, Total_Stock: { $sum: '$Stock_qty' } } }])",
    run: queries.sql5_totalStockQuantity
  },
  {
    id: 'sql6',
    category: 'SQL Join',
    title: '6. Employee and Branch ($lookup JOIN)',
    sql: 'SELECT E.Name, B.Location FROM Employee E JOIN Branch B ON E.Branch_ID = B.Branch_ID;',
    mongo: "db.employees.aggregate([\n  { $lookup: { from: 'branches', localField: 'Branch_ID', foreignField: 'Branch_ID', as: 'b' } },\n  { $unwind: '$b' },\n  { $project: { _id: 0, Name: '$Name', Location: '$b.Location' } }\n])",
    run: queries.sql6_employeeBranchJoin
  },
  {
    id: 'sql7',
    category: 'SQL Join',
    title: '7. Product and Category ($lookup JOIN)',
    sql: 'SELECT P.Name AS Product_Name, C.Category_Name FROM Product P JOIN Category C ON P.Category_ID = C.Category_ID;',
    mongo: "db.products.aggregate([\n  { $lookup: { from: 'categories', localField: 'Category_ID', foreignField: 'Category_ID', as: 'c' } },\n  { $unwind: '$c' },\n  { $project: { _id: 0, Product_Name: '$Name', Category_Name: '$c.Category_Name' } }\n])",
    run: queries.sql7_productCategoryJoin
  },
  {
    id: 'sql8',
    category: 'SQL Join',
    title: '8. Bill and Customer ($lookup JOIN)',
    sql: 'SELECT B.Bill_No, C.Name AS Customer_Name, B.Gross_Amt, B.Net_Amt FROM Bill_Transaction B JOIN Customer C ON B.Cust_ID = C.Cust_ID;',
    mongo: "db.bills.aggregate([\n  { $lookup: { from: 'customers', localField: 'Cust_ID', foreignField: 'Cust_ID', as: 'c' } },\n  { $unwind: '$c' },\n  { $project: { _id: 0, Bill_No: 1, Customer_Name: '$c.Name', Gross_Amt: 1, Net_Amt: 1 } }\n])",
    run: queries.sql8_billCustomerJoin
  },
  {
    id: 'sql9',
    category: 'SQL Comparison',
    title: '9. Batches where Stock_qty > Reorder_level ($expr)',
    sql: 'SELECT Batch_Number, Product_ID, Stock_qty, Reorder_level FROM Batch_Inventory WHERE Stock_qty > Reorder_level;',
    mongo: "db.batch_inventory.find({ $expr: { $gt: ['$Stock_qty', '$Reorder_level'] } })",
    run: queries.sql9_stockGreaterThanReorder
  },
  {
    id: 'sql10',
    category: 'SQL Multi-Join',
    title: '10. Complete Bill Line Items Multi-Join',
    sql: 'SELECT BT.Bill_No, C.Name AS Customer_Name, E.Name AS Employee_Name, P.Name AS Product_Name, BI.Quantity_sold, BI.Subtotal\nFROM Bill_Transaction BT\nJOIN Customer C ON BT.Cust_ID = C.Cust_ID\nJOIN Employee E ON BT.Emp_ID = E.Emp_ID\nJOIN Bill_Items BI ON BT.Bill_No = BI.Bill_No\nJOIN Product P ON BI.Product_ID = P.Product_ID;',
    mongo: "db.bills.aggregate([\n  { $lookup: { from: 'customers', localField: 'Cust_ID', foreignField: 'Cust_ID', as: 'c' } }, { $unwind: '$c' },\n  { $lookup: { from: 'employees', localField: 'Emp_ID', foreignField: 'Emp_ID', as: 'e' } }, { $unwind: '$e' },\n  { $unwind: '$items' },\n  { $lookup: { from: 'products', localField: 'items.Product_ID', foreignField: 'Product_ID', as: 'p' } }, { $unwind: '$p' },\n  { $project: { _id: 0, Bill_No: 1, Customer_Name: '$c.Name', Employee_Name: '$e.Name', Product_Name: '$p.Name', Quantity_sold: '$items.Quantity_sold', Subtotal: '$items.Subtotal' } }\n])",
    run: queries.sql10_fullBillTransactionJoin
  },
  {
    id: 'sql11',
    category: 'SQL Update',
    title: '11. Update Customer Phone (updateOne)',
    sql: "UPDATE Customer SET Phn_No = '9888888888' WHERE Cust_ID = 205;",
    mongo: "db.customers.updateOne({ Cust_ID: 205 }, { $set: { Phn_No: '9888888888' } })",
    run: queries.sql11_updateCustomerPhone
  },
  {
    id: 'sql12',
    category: 'SQL Group By',
    title: '12. Number of Products in Each Category',
    sql: 'SELECT Category_ID, COUNT(*) AS Product_Count FROM Product GROUP BY Category_ID;',
    mongo: "db.products.aggregate([\n  { $group: { _id: '$Category_ID', Product_Count: { $sum: 1 } } },\n  { $project: { _id: 0, Category_ID: '$_id', Product_Count: 1 } },\n  { $sort: { Category_ID: 1 } }\n])",
    run: queries.sql12_productCountByCategory
  },
  {
    id: 'sql13',
    category: 'SQL Having',
    title: '13. Categories Having Count >= 1',
    sql: 'SELECT Category_ID, COUNT(*) AS Product_Count FROM Product GROUP BY Category_ID HAVING COUNT(*) >= 1;',
    mongo: "db.products.aggregate([\n  { $group: { _id: '$Category_ID', Product_Count: { $sum: 1 } } },\n  { $match: { Product_Count: { $gte: 1 } } },\n  { $project: { _id: 0, Category_ID: '$_id', Product_Count: 1 } }\n])",
    run: queries.sql13_categoriesHavingCountGe1
  },
  {
    id: 'sql14',
    category: 'SQL Subquery',
    title: '14. Product with Highest Base Price',
    sql: 'SELECT Product_ID, Name, Base_Price FROM Product WHERE Base_Price = (SELECT MAX(Base_Price) FROM Product);',
    mongo: "db.products.find({}, { projection: { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 } }).sort({ Base_Price: -1 }).limit(1)",
    run: queries.sql14_highestBasePriceProduct
  },
  {
    id: 'sql15',
    category: 'SQL Stats',
    title: '15. Total, Average, Max and Min Base Price',
    sql: 'SELECT SUM(Base_Price) AS Total_Price, AVG(Base_Price) AS Average_Price, MAX(Base_Price) AS Maximum_Price, MIN(Base_Price) AS Minimum_Price FROM Product;',
    mongo: "db.products.aggregate([\n  { $group: { _id: null, Total_Price: { $sum: '$Base_Price' }, Average_Price: { $avg: '$Base_Price' }, Maximum_Price: { $max: '$Base_Price' }, Minimum_Price: { $min: '$Base_Price' } } },\n  { $project: { _id: 0 } }\n])",
    run: queries.sql15_priceStatistics
  },
  {
    id: 'plsql1',
    category: 'PL/SQL Cursor Loop',
    title: 'PL/SQL 1. Calculate Total Stock using Cursor Loop',
    sql: "DECLARE total_stock NUMBER := 0; BEGIN FOR r IN (SELECT Stock_qty FROM Batch_Inventory) LOOP total_stock := total_stock + r.Stock_qty; END LOOP; DBMS_OUTPUT.PUT_LINE('Total Stock = ' || total_stock); END;",
    mongo: "let total = 0;\nfor await (const doc of db.batch_inventory.find({}, { projection: { Stock_qty: 1 } })) {\n  total += doc.Stock_qty;\n}",
    run: queries.plsql1_calculateStockLoop
  },
  {
    id: 'plsql2',
    category: 'PL/SQL Function',
    title: 'PL/SQL 2. Function to Calculate Discounted Price (1000, 10%)',
    sql: "CREATE OR REPLACE FUNCTION discounted_price(p_price NUMBER, p_discount NUMBER) RETURN NUMBER IS BEGIN RETURN p_price - (p_price * p_discount / 100); END;",
    mongo: "function discounted_price(p_price, p_discount) { return p_price - (p_price * p_discount / 100); }",
    run: () => queries.plsql2_discountedPrice(1000, 10)
  },
  {
    id: 'plsql3',
    category: 'PL/SQL Function',
    title: 'PL/SQL 3. Function to Find Highest Product Price',
    sql: "CREATE OR REPLACE FUNCTION highest_product_price RETURN NUMBER IS BEGIN SELECT MAX(Base_Price) INTO highest_price FROM Product; RETURN highest_price; END;",
    mongo: "await db.products.find().sort({ Base_Price: -1 }).limit(1).next()",
    run: queries.plsql3_highestProductPrice
  },
  {
    id: 'plsql4',
    category: 'PL/SQL Function',
    title: 'PL/SQL 4. Function to Get Bill Amount for Bill #601',
    sql: "CREATE OR REPLACE FUNCTION get_bill_amount(p_bill_no NUMBER) RETURN NUMBER IS BEGIN SELECT Net_Amt INTO amount FROM Bill_Transaction WHERE Bill_No = p_bill_no; RETURN amount; END;",
    mongo: "await db.bills.findOne({ Bill_No: 601 }, { projection: { Net_Amt: 1 } })",
    run: () => queries.plsql4_getBillAmount(601)
  },
  {
    id: 'plsql5',
    category: 'PL/SQL Function',
    title: 'PL/SQL 5. Function to Check Stock Availability for Batch #501',
    sql: "CREATE OR REPLACE FUNCTION check_stock(p_batch_no NUMBER) RETURN VARCHAR2 IS BEGIN SELECT Stock_qty INTO qty FROM Batch_Inventory WHERE Batch_Number = p_batch_no; IF qty > 0 THEN RETURN 'Available'; ELSE RETURN 'Out of Stock'; END IF; END;",
    mongo: "const doc = await db.batch_inventory.findOne({ Batch_Number: 501 }); return doc.Stock_qty > 0 ? 'Available' : 'Out of Stock';",
    run: () => queries.plsql5_checkStock(501)
  },
  {
    id: 'plsql6',
    category: 'PL/SQL Procedure',
    title: 'PL/SQL 6. Procedure to Display All Products',
    sql: "CREATE OR REPLACE PROCEDURE display_products IS BEGIN FOR r IN (SELECT Product_ID, Name, Base_Price FROM Product) LOOP DBMS_OUTPUT.PUT_LINE('ID: ' || r.Product_ID || ' Name: ' || r.Name || ' Price: ' || r.Base_Price); END LOOP; END;",
    mongo: "const items = await db.products.find().toArray(); items.map(r => `ID: ${r.Product_ID} Name: ${r.Name} Price: ${r.Base_Price}`)",
    run: queries.plsql6_displayProducts
  },
  {
    id: 'plsql7',
    category: 'PL/SQL Procedure',
    title: 'PL/SQL 7. Procedure to Update Product Price (ID: 301 to 65)',
    sql: "CREATE OR REPLACE PROCEDURE update_product_price(p_product_id NUMBER, p_new_price NUMBER) IS BEGIN UPDATE Product SET Base_Price = p_new_price WHERE Product_ID = p_product_id; COMMIT; END;",
    mongo: "await db.products.updateOne({ Product_ID: 301 }, { $set: { Base_Price: 65 } })",
    run: () => queries.plsql7_updateProductPrice(301, 65)
  },
  {
    id: 'plsql8',
    category: 'PL/SQL Procedure',
    title: 'PL/SQL 8. Procedure to Display Customer Details (ID: 201)',
    sql: "CREATE OR REPLACE PROCEDURE customer_details(p_cust_id NUMBER) IS BEGIN SELECT Name, Phn_No, Email INTO v_name, v_phone, v_email FROM Customer WHERE Cust_ID = p_cust_id; END;",
    mongo: "await db.customers.findOne({ Cust_ID: 201 })",
    run: () => queries.plsql8_customerDetails(201)
  },
  {
    id: 'plsql9',
    category: 'PL/SQL Cursor',
    title: 'PL/SQL 9. Display All Customers using Cursor',
    sql: "DECLARE CURSOR cust_cursor IS SELECT Name, Phn_No FROM Customer; BEGIN OPEN cust_cursor; LOOP FETCH cust_cursor INTO v_name, v_phone; EXIT WHEN cust_cursor%NOTFOUND; DBMS_OUTPUT.PUT_LINE('Name: ' || v_name || ' Phone: ' || v_phone); END LOOP; CLOSE cust_cursor; END;",
    mongo: "for await (const row of db.customers.find({}, { projection: { Name: 1, Phn_No: 1 } })) { ... }",
    run: queries.plsql9_cursorCustomers
  },
  {
    id: 'plsql10',
    category: 'PL/SQL Cursor Join',
    title: 'PL/SQL 10. Display Products with Category Names using Cursor',
    sql: "DECLARE CURSOR product_cursor IS SELECT P.Name, C.Category_Name FROM Product P JOIN Category C ON P.Category_ID = C.Category_ID; BEGIN FOR r IN product_cursor LOOP ... END LOOP; END;",
    mongo: "db.products.aggregate([{ $lookup: { from: 'categories', localField: 'Category_ID', foreignField: 'Category_ID', as: 'c' } }, { $unwind: '$c' }])",
    run: queries.plsql10_cursorProductCategories
  },
  {
    id: 'plsql11',
    category: 'PL/SQL Function',
    title: 'PL/SQL 11. Function to Find Total Stock Value for Batch #501',
    sql: "CREATE OR REPLACE FUNCTION stock_value(p_batch_no NUMBER) RETURN NUMBER IS BEGIN SELECT Stock_qty * Cost_Price INTO v_value FROM Batch_Inventory WHERE Batch_Number = p_batch_no; RETURN v_value; END;",
    mongo: "const b = await db.batch_inventory.findOne({ Batch_Number: 501 }); return b.Stock_qty * b.Cost_Price;",
    run: () => queries.plsql11_stockValue(501)
  },
  {
    id: 'plsql12',
    category: 'PL/SQL Function',
    title: 'PL/SQL 12. Function to Calculate Selling Price After Tax for Product #301',
    sql: "CREATE OR REPLACE FUNCTION price_with_tax(p_product_id NUMBER) RETURN NUMBER IS BEGIN SELECT Base_Price, Tax INTO v_price, v_tax FROM Product WHERE Product_ID = p_product_id; RETURN v_price + (v_price * v_tax / 100); END;",
    mongo: "const p = await db.products.findOne({ Product_ID: 301 }); return p.Base_Price + (p.Base_Price * p.Tax / 100);",
    run: () => queries.plsql12_priceWithTax(301)
  },
  {
    id: 'plsql13',
    category: 'PL/SQL Function',
    title: 'PL/SQL 13. Function to Find Total Items Sold in Bill #601',
    sql: "CREATE OR REPLACE FUNCTION total_items_sold(p_bill_no NUMBER) RETURN NUMBER IS BEGIN SELECT SUM(Quantity_sold) INTO v_total FROM Bill_Items WHERE Bill_No = p_bill_no; RETURN NVL(v_total, 0); END;",
    mongo: "const b = await db.bills.findOne({ Bill_No: 601 }); return b.items.reduce((s, i) => s + i.Quantity_sold, 0);",
    run: () => queries.plsql13_totalItemsSold(601)
  },
  {
    id: 'plsql14',
    category: 'PL/SQL Function',
    title: "PL/SQL 14. Function to Return 'EXPENSIVE' if Price > 100 else 'NORMAL'",
    sql: "CREATE OR REPLACE FUNCTION price_category(p_product_id NUMBER) RETURN VARCHAR2 IS BEGIN SELECT Base_Price INTO v_price FROM Product WHERE Product_ID = p_product_id; IF v_price > 100 THEN RETURN 'EXPENSIVE'; ELSE RETURN 'NORMAL'; END IF; END;",
    mongo: "const p = await db.products.findOne({ Product_ID: 301 }); return p.Base_Price > 100 ? 'EXPENSIVE' : 'NORMAL';",
    run: () => queries.plsql14_priceCategory(301)
  },
  {
    id: 'plsql15',
    category: 'PL/SQL Procedure',
    title: 'PL/SQL 15. Procedure to Increase Product Base Price by 10% (Product #301)',
    sql: "CREATE OR REPLACE PROCEDURE increase_price(p_product_id NUMBER, p_percentage NUMBER) IS BEGIN UPDATE Product SET Base_Price = Base_Price + (Base_Price * p_percentage / 100) WHERE Product_ID = p_product_id; END;",
    mongo: "const p = await db.products.findOne({ Product_ID: 301 }); const newPrice = p.Base_Price * (1 + 10 / 100); await db.products.updateOne({ Product_ID: 301 }, { $set: { Base_Price: newPrice } });",
    run: () => queries.plsql15_increasePrice(301, 10)
  }
];

module.exports = { queries, queryCatalog };
