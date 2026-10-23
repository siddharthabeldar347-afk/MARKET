# Verification Checklist & Lab Evaluation Report
**Project**: Supermarket Inventory & Billing System (DBMS Lab DA-3)
**Student**: Siddhartha Beldar | **Reg No**: 25BCE5089 | **Course**: BACSE202 (Database Systems)

---

## 1. Automated Integration Test Suite Results

Command:
```powershell
npm test
```
**Outcome**: **51 PASSED, 0 FAILED** (100% Pass Rate).

| Test ID | Test Category | Description | Status |
|---|---|---|---|
| T01 | Schema & Seeding | Collection 'categories' created and contains seed records | ✅ PASS |
| T02 | Schema & Seeding | Collection 'suppliers' created and contains seed records | ✅ PASS |
| T03 | Schema & Seeding | Collection 'branches' created and contains seed records | ✅ PASS |
| T04 | Schema & Seeding | Collection 'customers' created and contains seed records | ✅ PASS |
| T05 | Schema & Seeding | Collection 'products' created and contains seed records | ✅ PASS |
| T06 | Schema & Seeding | Collection 'employees' created and contains seed records | ✅ PASS |
| T07 | Schema & Seeding | Collection 'batch_inventory' created and contains seed records | ✅ PASS |
| T08 | Schema & Seeding | Collection 'bills' created and contains seed records | ✅ PASS |
| T09 | Schema & Seeding | Collection 'bill_items' created and contains seed records | ✅ PASS |
| T10 | Schema & Seeding | Collection 'returns' created and contains seed records | ✅ PASS |
| T11 | Schema & Seeding | Collection 'employs' created and contains seed records | ✅ PASS |
| T12 | `$jsonSchema` | Rejects category document missing required 'Category_Name' | ✅ PASS |
| T13 | `$jsonSchema` | Rejects batch_inventory with negative stock quantity (`minimum: 0`) | ✅ PASS |
| T14 | CRUD Operations | Create & Read Category (Insert document, verify by ID) | ✅ PASS |
| T15 | CRUD Operations | Update Category (`Category_Name` modification) | ✅ PASS |
| T16 | CRUD Operations | Delete Category (Removal verification) | ✅ PASS |
| T17 | CRUD Operations | Create Product and join with Category (`$lookup`) | ✅ PASS |
| T18 | Atomic Billing | Atomic stock decrement on inventory checkout | ✅ PASS |
| T19 | Atomic Billing | Stock decreases from initial to remaining (100 -> 95) | ✅ PASS |
| T20 | Atomic Billing | Out-of-Stock rejection (Excessive quantity rejected) | ✅ PASS |
| T21 | Returns Restock | Stock restored on return logged (95 + 2 = 97) | ✅ PASS |
| T22 | SQL Query 1 | Filter products with Base_Price > 50 | ✅ PASS |
| T23 | SQL Query 2 | Filter products with Base_Price between 50 and 150 | ✅ PASS |
| T24 | SQL Query 3 | Filter customers starting with 'K' | ✅ PASS |
| T25 | SQL Query 4 | Sort products by Base_Price ascending | ✅ PASS |
| T26 | SQL Query 5 | Total stock quantity SUM across batches = 480 | ✅ PASS |
| T27 | SQL Query 6 | Employee JOIN Branch via `$lookup` | ✅ PASS |
| T28 | SQL Query 7 | Product JOIN Category via `$lookup` | ✅ PASS |
| T29 | SQL Query 8 | Bill JOIN Customer via `$lookup` | ✅ PASS |
| T30 | SQL Query 9 | Batches where Stock_qty > Reorder_level (`$expr`) | ✅ PASS |
| T31 | SQL Query 10 | Multi-table Join for Bill Line Items | ✅ PASS |
| T32 | SQL Query 11 | Update customer phone number (`updateOne`) | ✅ PASS |
| T33 | SQL Query 12 | Product count grouped by Category (`$group`) | ✅ PASS |
| T34 | SQL Query 13 | Categories having count >= 1 (`$group` + `$match`) | ✅ PASS |
| T35 | SQL Query 14 | Product with maximum base price (150) | ✅ PASS |
| T36 | SQL Query 15 | Price aggregates: SUM=440, AVG=88, MAX=150, MIN=30 | ✅ PASS |
| T37 | PL/SQL 1 | Cursor loop total stock calculation = 480 | ✅ PASS |
| T38 | PL/SQL 2 | Discounted price calculation (1000 - 10% = 900) | ✅ PASS |
| T39 | PL/SQL 3 | Highest product price function = 150 | ✅ PASS |
| T40 | PL/SQL 4 | Bill #601 Net Amount function = 480 | ✅ PASS |
| T41 | PL/SQL 5 | Check stock availability for batch 501 = 'Available' | ✅ PASS |
| T42 | PL/SQL 6 | Display products formatted lines procedure | ✅ PASS |
| T43 | PL/SQL 7 | Update product price procedure (301 to 65) | ✅ PASS |
| T44 | PL/SQL 8 | Customer details procedure (Cust 201: Kumara Priya) | ✅ PASS |
| T45 | PL/SQL 9 | Explicit cursor iteration over customers | ✅ PASS |
| T46 | PL/SQL 10 | Cursor products with category join | ✅ PASS |
| T47 | PL/SQL 11 | Stock value function (Batch 501: 100 * 50 = 5000) | ✅ PASS |
| T48 | PL/SQL 12 | Price with tax function (Product 301: 60 + 5% = 63) | ✅ PASS |
| T49 | PL/SQL 13 | Total items sold in Bill #601 = 5 | ✅ PASS |
| T50 | PL/SQL 14 | Price category function (Product 304 = 'EXPENSIVE') | ✅ PASS |
| T51 | PL/SQL 15 | Increase price by 10% procedure (Product 301: 60 -> 66) | ✅ PASS |

---

## 2. Interactive Features Checklist

- [x] **Point of Sale (POS) Checkout**:
  - Live customer and cashier selection
  - Dynamic inventory batch picker with live stock preview
  - Real-time gross amount, discount, and net amount computation
  - Instant stock reduction in database
  - Modal invoice receipt with printable layout
- [x] **Inventory & Batch Tracking**:
  - Full batch listing with product, supplier, and branch joins
  - Status indicators: `Available`, `Low Stock`, `Out of Stock`
  - Quick stock update modal
  - Add new batch modal
- [x] **Products & Pricing**:
  - Search by product name
  - Filter by category
  - Filter by price range (Min/Max)
  - Sort by price (ASC/DESC)
  - Tax calculation & price category badge
  - Quick price % increase trigger
- [x] **Master Records (5 Subtabs)**:
  - Categories (CRUD)
  - Suppliers (CRUD)
  - Branches (CRUD)
  - Employees with branch assignment (CRUD)
  - Customers with search and phone updater (CRUD)
- [x] **Returns Management**:
  - Customer return form
  - Atomic inventory stock replenishment
  - Audit history of logged returns
- [x] **Reports & Analytics**:
  - KPI cards (Revenue, Total Stock, Active Batches, Low Stock)
  - Category breakdown table
  - Price statistics (SUM, AVG, MAX, MIN)
  - Reorder threshold warning list
- [x] **Lab Viva & Query Demonstration Explorer**:
  - 30 side-by-side SQL/PL-SQL vs MongoDB comparisons
  - Live execution buttons with millisecond response timing
  - Run-All batch executor
  - One-click DA-2 database reseed button
