# Supermarket Inventory & Billing System — MongoDB Queries Reference
**Student**: Siddhartha Beldar | **Reg No**: 25BCE5089 | **Course**: Database Systems (BACSE202) | **Slot**: D1+TD1

This reference guide maps every single SQL operation and PL/SQL program from **Digital Assignment – 2 (DA-2)** to its exact **MongoDB Shell (`mongosh`)** query and **Node.js Official MongoDB Driver** aggregation pipeline.

---

## Part 1: SQL Operations (Queries 1 to 15)

### Query 1: Filter Products with Base Price > ₹50
- **DA-2 SQL**:
  ```sql
  SELECT Name, Base_Price FROM Product WHERE Base_Price > 50;
  ```
- **MongoDB Shell (`mongosh`)**:
  ```javascript
  db.products.find(
    { Base_Price: { $gt: 50 } },
    { _id: 0, Name: 1, Base_Price: 1 }
  );
  ```
- **Explanation**: In MongoDB, the `$gt` comparison operator matches values greater than 50. Projection `{ _id: 0, Name: 1, Base_Price: 1 }` specifies which fields to include.
- **Result**: Rice (60), Juice (80), Shampoo (150), Detergent (120).

---

### Query 2: Filter Products with Base Price Between ₹50 and ₹150
- **DA-2 SQL**:
  ```sql
  SELECT Product_ID, Name, Base_Price FROM Product WHERE Base_Price BETWEEN 50 AND 150;
  ```
- **MongoDB Shell (`mongosh`)**:
  ```javascript
  db.products.find(
    { Base_Price: { $gte: 50, $lte: 150 } },
    { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 }
  );
  ```
- **Explanation**: `$gte` (greater than or equal to) and `$lte` (less than or equal to) specify range constraints in MongoDB documents.
- **Result**: Products 301 (Rice), 302 (Juice), 304 (Shampoo), 305 (Detergent).

---

### Query 3: Details of Customers Whose Name Starts with 'K'
- **DA-2 SQL**:
  ```sql
  SELECT * FROM Customer WHERE Name LIKE 'K%';
  ```
- **MongoDB Shell (`mongosh`)**:
  ```javascript
  db.customers.find(
    { Name: { $regex: /^K/i } },
    { _id: 0 }
  );
  ```
- **Explanation**: SQL's `LIKE 'K%'` translates to a regular expression `^K` in MongoDB, where `^` denotes start-of-string and `i` gives case-insensitivity.
- **Result**: Kumara Priya (201), Kavin (204).

---

### Query 4: Display Products in Ascending Order of Price
- **DA-2 SQL**:
  ```sql
  SELECT Name, Base_Price FROM Product ORDER BY Base_Price ASC;
  ```
- **MongoDB Shell (`mongosh`)**:
  ```javascript
  db.products.find(
    {},
    { _id: 0, Name: 1, Base_Price: 1 }
  ).sort({ Base_Price: 1 });
  ```
- **Explanation**: `.sort({ Base_Price: 1 })` sorts in ascending order (use `-1` for descending).
- **Result**: Biscuits (30), Rice (60), Juice (80), Detergent (120), Shampoo (150).

---

### Query 5: Find Total Quantity of Stock in All Batches (SUM)
- **DA-2 SQL**:
  ```sql
  SELECT SUM(Stock_qty) AS Total_Stock FROM Batch_Inventory;
  ```
- **MongoDB Aggregation**:
  ```javascript
  db.batch_inventory.aggregate([
    {
      $group: {
        _id: null,
        Total_Stock: { $sum: "$Stock_qty" }
      }
    },
    { $project: { _id: 0, Total_Stock: 1 } }
  ]);
  ```
- **Explanation**: In MongoDB Aggregation, `$group` with `_id: null` aggregates across all documents in the collection, and `$sum: "$Stock_qty"` accumulates the field.
- **Result**: `Total_Stock: 480`.

---

### Query 6: Display Employee Name Along with Branch Location (JOIN)
- **DA-2 SQL**:
  ```sql
  SELECT E.Name, B.Location
  FROM Employee E JOIN Branch B ON E.Branch_ID = B.Branch_ID;
  ```
- **MongoDB Aggregation (`$lookup`)**:
  ```javascript
  db.employees.aggregate([
    {
      $lookup: {
        from: "branches",
        localField: "Branch_ID",
        foreignField: "Branch_ID",
        as: "branch"
      }
    },
    { $unwind: "$branch" },
    {
      $project: {
        _id: 0,
        Name: "$Name",
        Location: "$branch.Location"
      }
    }
  ]);
  ```
- **Explanation**: `$lookup` performs an equijoin to the `branches` collection on `Branch_ID`. `$unwind` deconstructs the resulting array into an embedded object.

---

### Query 7: Display Each Product Name Along with Category Name (JOIN)
- **DA-2 SQL**:
  ```sql
  SELECT P.Name AS Product_Name, C.Category_Name
  FROM Product P JOIN Category C ON P.Category_ID = C.Category_ID;
  ```
- **MongoDB Aggregation (`$lookup`)**:
  ```javascript
  db.products.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "Category_ID",
        foreignField: "Category_ID",
        as: "category"
      }
    },
    { $unwind: "$category" },
    {
      $project: {
        _id: 0,
        Product_Name: "$Name",
        Category_Name: "$category.Category_Name"
      }
    }
  ]);
  ```

---

### Query 8: Display Bill Number, Customer Name, Gross Amount & Net Amount
- **DA-2 SQL**:
  ```sql
  SELECT B.Bill_No, C.Name AS Customer_Name, B.Gross_Amt, B.Net_Amt
  FROM Bill_Transaction B JOIN Customer C ON B.Cust_ID = C.Cust_ID;
  ```
- **MongoDB Aggregation (`$lookup`)**:
  ```javascript
  db.bills.aggregate([
    {
      $lookup: {
        from: "customers",
        localField: "Cust_ID",
        foreignField: "Cust_ID",
        as: "customer"
      }
    },
    { $unwind: "$customer" },
    {
      $project: {
        _id: 0,
        Bill_No: 1,
        Customer_Name: "$customer.Name",
        Gross_Amt: 1,
        Net_Amt: 1
      }
    }
  ]);
  ```

---

### Query 9: Batches Where Current Stock is Greater Than Reorder Level
- **DA-2 SQL**:
  ```sql
  SELECT Batch_Number, Product_ID, Stock_qty, Reorder_level
  FROM Batch_Inventory
  WHERE Stock_qty > Reorder_level;
  ```
- **MongoDB Shell (`$expr`)**:
  ```javascript
  db.batch_inventory.find(
    { $expr: { $gt: ["$Stock_qty", "$Reorder_level"] } },
    { _id: 0, Batch_Number: 1, Product_ID: 1, Stock_qty: 1, Reorder_level: 1 }
  );
  ```
- **Explanation**: To compare two fields from the same document in MongoDB, use the `$expr` operator with `$gt`.

---

### Query 10: Multi-Table Join for Bill Line Items
- **DA-2 SQL**:
  ```sql
  SELECT BT.Bill_No, C.Name AS Customer_Name, E.Name AS Employee_Name,
         P.Name AS Product_Name, BI.Quantity_sold, BI.Subtotal
  FROM Bill_Transaction BT
  JOIN Customer C ON BT.Cust_ID = C.Cust_ID
  JOIN Employee E ON BT.Emp_ID = E.Emp_ID
  JOIN Bill_Items BI ON BT.Bill_No = BI.Bill_No
  JOIN Product P ON BI.Product_ID = P.Product_ID;
  ```
- **MongoDB Aggregation (`$lookup` across embedded items)**:
  ```javascript
  db.bills.aggregate([
    { $lookup: { from: "customers", localField: "Cust_ID", foreignField: "Cust_ID", as: "c" } },
    { $unwind: "$c" },
    { $lookup: { from: "employees", localField: "Emp_ID", foreignField: "Emp_ID", as: "e" } },
    { $unwind: "$e" },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.Product_ID", foreignField: "Product_ID", as: "p" } },
    { $unwind: "$p" },
    {
      $project: {
        _id: 0,
        Bill_No: 1,
        Customer_Name: "$c.Name",
        Employee_Name: "$e.Name",
        Product_Name: "$p.Name",
        Quantity_sold: "$items.Quantity_sold",
        Subtotal: "$items.Subtotal"
      }
    }
  ]);
  ```

---

### Query 11: Update Phone Number of Customer
- **DA-2 SQL**:
  ```sql
  UPDATE Customer SET Phn_No = '9888888888' WHERE Cust_ID = 205;
  ```
- **MongoDB Shell**:
  ```javascript
  db.customers.updateOne(
    { Cust_ID: 205 },
    { $set: { Phn_No: "9888888888" } }
  );
  ```

---

### Query 12: Number of Products in Each Category (GROUP BY)
- **DA-2 SQL**:
  ```sql
  SELECT Category_ID, COUNT(*) AS Product_Count
  FROM Product
  GROUP BY Category_ID;
  ```
- **MongoDB Aggregation (`$group`)**:
  ```javascript
  db.products.aggregate([
    {
      $group: {
        _id: "$Category_ID",
        Product_Count: { $sum: 1 }
      }
    },
    { $project: { _id: 0, Category_ID: "$_id", Product_Count: 1 } },
    { $sort: { Category_ID: 1 } }
  ]);
  ```

---

### Query 13: Categories Having One or More Products (HAVING COUNT >= 1)
- **DA-2 SQL**:
  ```sql
  SELECT Category_ID, COUNT(*) AS Product_Count
  FROM Product
  GROUP BY Category_ID
  HAVING COUNT(*) >= 1;
  ```
- **MongoDB Aggregation (`$group` followed by `$match`)**:
  ```javascript
  db.products.aggregate([
    {
      $group: {
        _id: "$Category_ID",
        Product_Count: { $sum: 1 }
      }
    },
    { $match: { Product_Count: { $gte: 1 } } },
    { $project: { _id: 0, Category_ID: "$_id", Product_Count: 1 } }
  ]);
  ```
- **Explanation**: In MongoDB, SQL's `HAVING` clause is modeled by placing a `$match` stage *after* a `$group` stage.

---

### Query 14: Product Having the Highest Base Price (Subquery)
- **DA-2 SQL**:
  ```sql
  SELECT Product_ID, Name, Base_Price
  FROM Product
  WHERE Base_Price = (SELECT MAX(Base_Price) FROM Product);
  ```
- **MongoDB Shell**:
  ```javascript
  db.products.find(
    {},
    { _id: 0, Product_ID: 1, Name: 1, Base_Price: 1 }
  ).sort({ Base_Price: -1 }).limit(1);
  ```
- **Result**: Product 304 (Shampoo, 150.00).

---

### Query 15: Total, Average, Maximum and Minimum Base Price
- **DA-2 SQL**:
  ```sql
  SELECT SUM(Base_Price) AS Total_Price,
         AVG(Base_Price) AS Average_Price,
         MAX(Base_Price) AS Maximum_Price,
         MIN(Base_Price) AS Minimum_Price
  FROM Product;
  ```
- **MongoDB Aggregation**:
  ```javascript
  db.products.aggregate([
    {
      $group: {
        _id: null,
        Total_Price: { $sum: "$Base_Price" },
        Average_Price: { $avg: "$Base_Price" },
        Maximum_Price: { $max: "$Base_Price" },
        Minimum_Price: { $min: "$Base_Price" }
      }
    },
    { $project: { _id: 0 } }
  ]);
  ```
- **Result**: `Total_Price: 440`, `Average_Price: 88`, `Maximum_Price: 150`, `Minimum_Price: 30`.

---

## Part 2: PL/SQL Functions & Procedures Equivalent

| # | PL/SQL Feature | Oracle Definition | MongoDB Driver Implementation |
|---|---|---|---|
| 1 | **Calculate Stock with Loop** | `FOR r IN (SELECT Stock_qty FROM Batch_Inventory) LOOP total := total + r.Stock_qty; END LOOP;` | Uses `cursor = db.batch_inventory.find()` and `for await (const doc of cursor)` |
| 2 | **Discounted Price Function** | `p_price - (p_price * p_discount / 100)` | JavaScript pure function: `price - (price * discount / 100)` |
| 3 | **Highest Price Function** | `SELECT MAX(Base_Price) INTO highest_price FROM Product;` | `db.products.find().sort({ Base_Price: -1 }).limit(1).next()` |
| 4 | **Get Bill Amount Function** | `SELECT Net_Amt INTO amount FROM Bill_Transaction WHERE Bill_No = p_bill_no;` | `db.bills.findOne({ Bill_No: billNo }, { projection: { Net_Amt: 1 } })` |
| 5 | **Check Stock Function** | `IF qty > 0 THEN RETURN 'Available'; ELSE RETURN 'Out of Stock';` | Conditional evaluation on `db.batch_inventory.findOne({ Batch_Number: batchNo })` |
| 6 | **Display Products Procedure** | `FOR r IN (SELECT ...) LOOP DBMS_OUTPUT.PUT_LINE(...)` | Iterates products and formats strings: `ID: 301 Name: Rice Price: 60` |
| 7 | **Update Product Price Procedure** | `UPDATE Product SET Base_Price = p_new_price WHERE Product_ID = p_id;` | `db.products.updateOne({ Product_ID: id }, { $set: { Base_Price: newPrice } })` |
| 8 | **Customer Details Procedure** | `SELECT Name, Phn_No, Email INTO ... WHERE Cust_ID = p_id` | `db.customers.findOne({ Cust_ID: id })` |
| 9 | **Explicit Cursor Customers** | `CURSOR cust_cursor IS SELECT Name, Phn_No FROM Customer;` | `cursor = db.customers.find({}, { projection: { Name: 1, Phn_No: 1 } })` |
| 10 | **Cursor Products with Category** | Cursor joining `Product P` and `Category C` | `$lookup` aggregation joining `products` and `categories` |
| 11 | **Stock Value Function** | `SELECT Stock_qty * Cost_Price INTO v_value FROM Batch_Inventory` | Computed field: `Stock_qty * Cost_Price` (501: 100 * 50 = 5000) |
| 12 | **Selling Price with Tax** | `Base_Price + (Base_Price * Tax / 100)` | Computed: `Base_Price * (1 + Tax / 100)` (301: 60 + 5% = 63.00) |
| 13 | **Total Items Sold in Bill** | `SELECT SUM(Quantity_sold) FROM Bill_Items WHERE Bill_No = p_bill_no;` | Sums `Quantity_sold` across embedded `items` array of bill |
| 14 | **Price Category Function** | `IF Base_Price > 100 THEN 'EXPENSIVE' ELSE 'NORMAL'` | Conditional check returning `'EXPENSIVE'` if price > 100 else `'NORMAL'` |
| 15 | **Increase Price by % Procedure** | `UPDATE Product SET Base_Price = Base_Price + (Base_Price * p_percentage / 100)` | `updateOne` with calculated percentage increment |
