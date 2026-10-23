// Database Seeder
// Populates MongoDB with exact sample records from DA-2 assignment
const { connectDB, closeDB } = require('./connection');
const { setupSchema } = require('./schema');

const seedData = {
  categories: [
    { Category_ID: 1, Category_Name: 'Grocery' },
    { Category_ID: 2, Category_Name: 'Beverages' },
    { Category_ID: 3, Category_Name: 'Snacks' },
    { Category_ID: 4, Category_Name: 'Personal Care' },
    { Category_ID: 5, Category_Name: 'Household' }
  ],

  suppliers: [
    { Supplier_ID: 101, Phone: '9876543210', Company_Name: 'ABC Distributors', Contact_Person: 'Arun Kumar' },
    { Supplier_ID: 102, Phone: '9876543211', Company_Name: 'Fresh Foods Ltd', Contact_Person: 'Ravi Kumar' },
    { Supplier_ID: 103, Phone: '9876543212', Company_Name: 'Daily Needs Pvt Ltd', Contact_Person: 'Suresh Babu' },
    { Supplier_ID: 104, Phone: '9876543213', Company_Name: 'Health Plus Suppliers', Contact_Person: 'Karthik Raj' },
    { Supplier_ID: 105, Phone: '9876543214', Company_Name: 'Home Care Distributors', Contact_Person: 'Vijay Anand' }
  ],

  branches: [
    { Branch_ID: 1, Location: 'Chennai', Phone: '04423456789' },
    { Branch_ID: 2, Location: 'Coimbatore', Phone: '04222345678' },
    { Branch_ID: 3, Location: 'Madurai', Phone: '04522345678' },
    { Branch_ID: 4, Location: 'Trichy', Phone: '04312345678' },
    { Branch_ID: 5, Location: 'Salem', Phone: '04272345678' }
  ],

  customers: [
    { Cust_ID: 201, Name: 'Kumara Priya', Phn_No: '9000000001', Email: 'priya@gmail.com' },
    { Cust_ID: 202, Name: 'Mehek Dama', Phn_No: '9000000002', Email: 'mehek@gmail.com' },
    { Cust_ID: 203, Name: 'Siddhartha Beldar', Phn_No: '9000000003', Email: 'beldar@gmail.com' },
    { Cust_ID: 204, Name: 'Kavin', Phn_No: '9000000004', Email: 'kavin@gmail.com' },
    { Cust_ID: 205, Name: 'Dharshini', Phn_No: '9000000005', Email: 'dharshini@gmail.com' }
  ],

  products: [
    { Product_ID: 301, Tax: 5.0, Name: 'Rice', Category_ID: 1, Base_Price: 60.0 },
    { Product_ID: 302, Tax: 12.0, Name: 'Juice', Category_ID: 2, Base_Price: 80.0 },
    { Product_ID: 303, Tax: 10.0, Name: 'Biscuits', Category_ID: 3, Base_Price: 30.0 },
    { Product_ID: 304, Tax: 18.0, Name: 'Shampoo', Category_ID: 4, Base_Price: 150.0 },
    { Product_ID: 305, Tax: 15.0, Name: 'Detergent', Category_ID: 5, Base_Price: 120.0 }
  ],

  employees: [
    { Emp_ID: 401, Name: 'Arun', Role: 'Cashier', Salary: 25000.0, Shift: 'Morning', Branch_ID: 1 },
    { Emp_ID: 402, Name: 'Bala', Role: 'Manager', Salary: 40000.0, Shift: 'Morning', Branch_ID: 2 },
    { Emp_ID: 403, Name: 'Charan', Role: 'Cashier', Salary: 26000.0, Shift: 'Evening', Branch_ID: 3 },
    { Emp_ID: 404, Name: 'Deepak', Role: 'Stock Manager', Salary: 30000.0, Shift: 'Morning', Branch_ID: 4 },
    { Emp_ID: 405, Name: 'Elango', Role: 'Cashier', Salary: 25000.0, Shift: 'Evening', Branch_ID: 5 }
  ],

  batch_inventory: [
    { Batch_Number: 501, Product_ID: 301, Supplier_ID: 101, Branch_ID: 1, Mfg_date: '2026-01-10', Exp_date: '2027-01-10', Reorder_level: 20, Stock_qty: 100, Cost_Price: 50.0, Selling_Price: 60.0 },
    { Batch_Number: 502, Product_ID: 302, Supplier_ID: 102, Branch_ID: 2, Mfg_date: '2026-02-15', Exp_date: '2026-08-15', Reorder_level: 15, Stock_qty: 80, Cost_Price: 65.0, Selling_Price: 80.0 },
    { Batch_Number: 503, Product_ID: 303, Supplier_ID: 103, Branch_ID: 3, Mfg_date: '2026-03-05', Exp_date: '2027-03-05', Reorder_level: 25, Stock_qty: 150, Cost_Price: 20.0, Selling_Price: 30.0 },
    { Batch_Number: 504, Product_ID: 304, Supplier_ID: 104, Branch_ID: 4, Mfg_date: '2026-04-12', Exp_date: '2028-04-12', Reorder_level: 10, Stock_qty: 60, Cost_Price: 120.0, Selling_Price: 150.0 },
    { Batch_Number: 505, Product_ID: 305, Supplier_ID: 105, Branch_ID: 5, Mfg_date: '2026-05-20', Exp_date: '2027-05-20', Reorder_level: 15, Stock_qty: 90, Cost_Price: 100.0, Selling_Price: 120.0 }
  ],

  bills: [
    {
      Bill_No: 601,
      Cust_ID: 201,
      Emp_ID: 401,
      Time: '2026-09-01',
      Gross_Amt: 500.0,
      Discount: 20.0,
      Net_Amt: 480.0,
      items: [
        { Batch_Number: 501, Product_ID: 301, Quantity_sold: 5, Subtotal: 300.0 }
      ]
    },
    {
      Bill_No: 602,
      Cust_ID: 202,
      Emp_ID: 402,
      Time: '2026-09-02',
      Gross_Amt: 800.0,
      Discount: 50.0,
      Net_Amt: 750.0,
      items: [
        { Batch_Number: 502, Product_ID: 302, Quantity_sold: 4, Subtotal: 320.0 }
      ]
    },
    {
      Bill_No: 603,
      Cust_ID: 203,
      Emp_ID: 403,
      Time: '2026-09-03',
      Gross_Amt: 300.0,
      Discount: 10.0,
      Net_Amt: 290.0,
      items: [
        { Batch_Number: 503, Product_ID: 303, Quantity_sold: 6, Subtotal: 180.0 }
      ]
    },
    {
      Bill_No: 604,
      Cust_ID: 204,
      Emp_ID: 404,
      Time: '2026-09-04',
      Gross_Amt: 1000.0,
      Discount: 100.0,
      Net_Amt: 900.0,
      items: [
        { Batch_Number: 504, Product_ID: 304, Quantity_sold: 3, Subtotal: 450.0 }
      ]
    },
    {
      Bill_No: 605,
      Cust_ID: 205,
      Emp_ID: 405,
      Time: '2026-09-05',
      Gross_Amt: 600.0,
      Discount: 30.0,
      Net_Amt: 570.0,
      items: [
        { Batch_Number: 505, Product_ID: 305, Quantity_sold: 5, Subtotal: 600.0 }
      ]
    }
  ],

  bill_items: [
    { Bill_No: 601, Batch_Number: 501, Product_ID: 301, Quantity_sold: 5, Subtotal: 300.0 },
    { Bill_No: 602, Batch_Number: 502, Product_ID: 302, Quantity_sold: 4, Subtotal: 320.0 },
    { Bill_No: 603, Batch_Number: 503, Product_ID: 303, Quantity_sold: 6, Subtotal: 180.0 },
    { Bill_No: 604, Batch_Number: 504, Product_ID: 304, Quantity_sold: 3, Subtotal: 450.0 },
    { Bill_No: 605, Batch_Number: 505, Product_ID: 305, Quantity_sold: 5, Subtotal: 600.0 }
  ],

  returns: [
    { Return_ID: 701, Return_date: '2026-09-06', Batch_Number: 501, Quantity_returned: 1, Reason: 'Damaged packaging' },
    { Return_ID: 702, Return_date: '2026-09-07', Batch_Number: 502, Quantity_returned: 1, Reason: 'Wrong flavor' },
    { Return_ID: 703, Return_date: '2026-09-08', Batch_Number: 503, Quantity_returned: 1, Reason: 'Customer preference' },
    { Return_ID: 704, Return_date: '2026-09-09', Batch_Number: 504, Quantity_returned: 1, Reason: 'Defective pump' },
    { Return_ID: 705, Return_date: '2026-09-10', Batch_Number: 505, Quantity_returned: 1, Reason: 'Seal broken' }
  ],

  employs: [
    { Branch_ID: 1, Emp_ID: 401, Since: '2025-06-01' },
    { Branch_ID: 2, Emp_ID: 402, Since: '2025-06-05' },
    { Branch_ID: 3, Emp_ID: 403, Since: '2025-07-01' },
    { Branch_ID: 4, Emp_ID: 404, Since: '2025-07-10' },
    { Branch_ID: 5, Emp_ID: 405, Since: '2025-08-01' }
  ]
};

async function seedDatabase() {
  const db = await connectDB();
  console.log('--- Seeding Database with DA-2 Assignment Data ---');

  // Ensure collections and validators exist
  await setupSchema();

  // Clear existing data and reseed
  for (const [colName, rows] of Object.entries(seedData)) {
    const col = db.collection(colName);
    await col.deleteMany({});
    const res = await col.insertMany(rows);
    console.log(`  ✓ Inserted ${res.insertedCount} documents into '${colName}'`);
  }

  console.log('✓ Seeding complete. All 11 collections populated with exact DA-2 data.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => closeDB())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, seedData };
