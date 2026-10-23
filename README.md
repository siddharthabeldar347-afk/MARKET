# Supermarket Inventory & Billing System (DBMS Lab DA-3)

**Student Name**: Siddhartha Beldar  
**Registration Number**: 25BCE5089  
**Course Code**: BACSE202 (Database Systems)  
**Slot**: D1+TD1  
**Technology Stack**: Vanilla HTML/CSS/JavaScript, Node.js, Express, MongoDB (Official MongoDB Driver, No Mongoose)

---

## 1. Project Overview

This project is the complete implementation of **Digital Assignment – 3 (DA-3)** for the Database Systems Laboratory. It transforms the relational model established in **DA-1 (E-R Diagram and Relational Schema)** and implemented in **DA-2 (SQL and PL/SQL)** into an enterprise-grade NoSQL document database system using **MongoDB**, backed by a **Node.js/Express** server and a responsive web frontend.

---

## 2. Relational-to-Document Schema Mapping

| Relational Table (DA-1 & DA-2) | MongoDB Collection (DA-3) | Primary Key / Unique Field | Modeling Pattern |
|---|---|---|---|
| `Table 5: Category` | `categories` | `Category_ID` | Standalone Collection with `$jsonSchema` |
| `Table 7: Supplier` | `suppliers` | `Supplier_ID` | Standalone Collection with `$jsonSchema` |
| `Table 3: Branch` | `branches` | `Branch_ID` | Standalone Collection with `$jsonSchema` |
| `Table 10: Customer` | `customers` | `Cust_ID` | Standalone Collection with `$jsonSchema` |
| `Table 9: Product` | `products` | `Product_ID` | References `Category_ID` (`$lookup`) |
| `Table 8: Employee` | `employees` | `Emp_ID` | References `Branch_ID` (`$lookup`) |
| `Table 1: Batch_Inventory` | `batch_inventory` | `Batch_Number` | References Product, Supplier, Branch |
| `Table 4: Bill_Transaction` | `bills` | `Bill_No` | **Embedded Document Pattern**: Contains `items: [{ Batch_Number, Product_ID, Quantity_sold, Subtotal }]` |
| `Table 6: Bill_Items` | `bill_items` | Composite: `Bill_No + Batch_Number + Product_ID` | Maintained for relational compliance & `$lookup` queries |
| `Table 2: Returns` | `returns` | `Return_ID` | References `Batch_Number` |
| `Table 11: Employs` | `employs` | Composite: `Branch_ID + Emp_ID` | References Branch and Employee |

### Why Embed `Bill_Items` inside `bills`?
In relational databases (DA-2), 1-to-many relationships require a separate normalized table (`Bill_Items`) joined with foreign keys.  
In MongoDB document modeling, a customer's bill items are **always retrieved, displayed, and checked out together**. Embedding `items` inside the bill document:
1. Eliminates expensive multi-table joins on every bill lookup.
2. Ensures atomic single-document writes during POS transactions.
3. Reflects the physical nature of a supermarket paper receipt.

---

## 3. Database Validation (`$jsonSchema`)

Unlike schema-less implementations, this system enforces strict validation at the MongoDB engine level using `$jsonSchema`. Any insert or update violating the schema (e.g. negative stock quantity, missing product names, invalid data types) is immediately rejected by the database.

Example schema validator configured in `db/schema.js`:
```javascript
{
  $jsonSchema: {
    bsonType: "object",
    required: ["Batch_Number", "Product_ID", "Stock_qty", "Selling_Price"],
    properties: {
      Stock_qty: {
        bsonType: ["int", "long", "double"],
        minimum: 0,
        description: "Stock cannot be negative"
      }
    }
  }
}
```

---

## 4. Setup and Execution Commands

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Server running locally on `mongodb://127.0.0.1:27017`

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Initialize Schema with `$jsonSchema` Validation
```powershell
npm run setup
```

### Step 3: Seed Original DA-2 Assignment Data
```powershell
npm run seed
```

### Step 4: Run Automated Integration Tests (51 Tests)
```powershell
npm test
```

### Step 5: Start Web Application
```powershell
npm start
```
Open **`http://localhost:3000`** in any web browser.

---

## 5. System Features & Modules

1. **Point of Sale (POS) Billing Counter**:
   - Customer and cashier selection
   - Dynamic inventory batch picker displaying real-time available stock
   - Quantity validation and cart summary
   - Real-time gross amount, discount, and net amount computation
   - **Atomic Stock Decrement**: Uses MongoDB `$inc: { Stock_qty: -qty }` with condition `{ Stock_qty: { $gte: qty } }`
   - Printable receipt modal formatted like an authentic supermarket invoice

2. **Batch Inventory & Stock Tracking**:
   - Tracks batch number, manufacturing date, expiry date, reorder level, and stock quantities
   - Badges: `Available` (green), `Low Stock` (orange), `Out of Stock` (red)
   - Quick stock adjustment and batch addition modal

3. **Products & Master Management**:
   - Products with base price, tax rate, and tax-inclusive selling price
   - Search by name, filter by category, sort by price (DA-2 Query 4)
   - Filter price range (DA-2 Query 1 & 2)
   - Increase price by percentage trigger (DA-2 PL/SQL 15)
   - Subtabs for Categories, Suppliers, Branches, Employees, Customers
   - Customer phone number update (DA-2 Query 11)

4. **Returns & Inventory Restocking**:
   - Record customer returns
   - Automatically restocks inventory using `$inc: { Stock_qty: +qty }`
   - Audit trail of all logged returns

5. **Reports & Analytics Dashboard**:
   - Visual KPIs: Total Revenue, Total Bills, Total Inventory Units, Low Stock alerts
   - Category Breakdown (DA-2 Query 12 & 13)
   - Price Statistical Aggregates: Total, Average, Max, Min (DA-2 Query 15)

6. **Interactive Lab Viva & Query Explorer**:
   - Side-by-side comparison for all 15 DA-2 SQL queries and 15 PL/SQL programs
   - Live **Run** buttons executing the queries directly on MongoDB with millisecond response timing
   - **Run All 30 Queries** batch test button for examiner demonstration
   - One-click **Reseed DA-2 Data** button in the header to reset state anytime

---

## 6. REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Database ping, collection counts, server status |
| `/api/reset-seed` | POST | Reseeds database with original DA-2 dataset |
| `/api/categories` | GET, POST | List all categories / Create category |
| `/api/categories/:id` | GET, PUT, DELETE | Single category operations |
| `/api/products` | GET, POST | List products (filters: search, category, price range, sort) |
| `/api/products/:id` | GET, PUT, DELETE | Single product operations |
| `/api/products/:id/increase-price` | PATCH | Increase base price by percentage (PL/SQL 15) |
| `/api/inventory` | GET, POST | List batches with `$lookup` / Add new batch |
| `/api/inventory/low-stock` | GET | Batches where `Stock_qty <= Reorder_level` |
| `/api/inventory/:batchNumber` | GET, PUT, DELETE | Update batch stock or delete |
| `/api/bills` | GET, POST | List bills / Process POS checkout with atomic stock decrement |
| `/api/bills/:billNo` | GET | Single bill with full populated line items |
| `/api/returns` | GET, POST | List returns / Process return and restock inventory |
| `/api/analytics/summary` | GET | Dashboard KPI summary |
| `/api/analytics/category-breakdown` | GET | Group by category statistics (DA-2 Q12/13) |
| `/api/analytics/price-stats` | GET | Price aggregates: SUM, AVG, MAX, MIN (DA-2 Q15) |
| `/api/analytics/queries` | GET | Catalog of 30 DA-2 translated queries |
| `/api/analytics/queries/run/:id` | POST | Execute a specific query live against MongoDB |

---

## 7. DBMS Lab Viva Preparation Guide

### Q1: What is the main difference between Relational DBMS (DA-2) and Document NoSQL (DA-3)?
**Answer**:
- **Data Structure**: RDBMS stores data in strict, flat 2D tables with rows and columns. MongoDB stores data in flexible, hierarchical BSON (Binary JSON) documents.
- **Relationships**: In RDBMS, relationships are enforced with Foreign Keys and resolved with `JOIN` clauses. In MongoDB, relationships can be **embedded** (1:few or tightly coupled items like bill items) or **referenced** using `$lookup` (1:many or loosely coupled items like categories or branches).
- **Scalability**: RDBMS typically scales vertically (larger server), whereas MongoDB is built for horizontal scale (sharding across multiple clusters).

### Q2: Why did you not use Mongoose in this project?
**Answer**:
Mongoose is an Object Document Mapper (ODM) that adds an abstraction layer over MongoDB. Using the **official MongoDB Node.js driver (`mongodb`)** directly:
1. Gives direct access to the MongoDB Aggregation Pipeline without ODM translation overhead.
2. Allows native use of `$jsonSchema` at the database level rather than application-level validation.
3. Teaches the true syntax and mechanics of MongoDB, which is the core objective of a DBMS lab.

### Q3: How is a SQL `JOIN` performed in MongoDB?
**Answer**:
Using the **`$lookup`** aggregation stage.  
Syntax:
```javascript
{
  $lookup: {
    from: "foreignCollection",
    localField: "localForeignKey",
    foreignField: "foreignPrimaryKey",
    as: "joinedArray"
  }
}
```
After `$lookup`, the **`$unwind`** stage is used to flatten the joined array into an object.

### Q4: How does MongoDB enforce schema validation?
**Answer**:
Through **`$jsonSchema`** specified in `db.createCollection(name, { validator: { $jsonSchema: ... } })`. When validation level is set to `strict` and validation action to `error`, MongoDB rejects any document that does not conform to the required fields, BSON types, or range constraints.

### Q5: How do you handle concurrency and avoid overselling in billing?
**Answer**:
Using MongoDB's **atomic update operations**. In `routes/billing.js`, we use:
```javascript
db.collection('batch_inventory').updateOne(
  { Batch_Number: batchNo, Stock_qty: { $gte: quantitySold } },
  { $inc: { Stock_qty: -quantitySold } }
);
```
Because MongoDB guarantees document-level atomicity, the condition `{ Stock_qty: { $gte: quantitySold } }` ensures that stock is only decremented if sufficient stock exists at that exact millisecond. If two cashiers attempt to sell the last unit simultaneously, only one succeeds and the other receives an `insufficient stock` error.
