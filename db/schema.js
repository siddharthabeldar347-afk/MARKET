// MongoDB Schema and $jsonSchema Validation Definitions
// Source of truth: DA-1 E-R Diagram and DA-2 Relational Schema (Tables 1-11)
const { connectDB, closeDB } = require('./connection');

const schemaDefinitions = {
  // Table 5: Category
  categories: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Category_ID', 'Category_Name'],
        properties: {
          Category_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Category_ID: Integer identifier (PK)'
          },
          Category_Name: {
            bsonType: 'string',
            maxLength: 50,
            description: 'Category_Name: String up to 50 characters'
          }
        }
      }
    },
    indexes: [{ key: { Category_ID: 1 }, options: { unique: true } }]
  },

  // Table 7: Supplier
  suppliers: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Supplier_ID', 'Company_Name'],
        properties: {
          Supplier_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Supplier_ID: Integer identifier (PK)'
          },
          Phone: {
            bsonType: ['string', 'null'],
            maxLength: 15,
            description: 'Phone: Contact phone number'
          },
          Company_Name: {
            bsonType: 'string',
            maxLength: 50,
            description: 'Company_Name: Business name'
          },
          Contact_Person: {
            bsonType: ['string', 'null'],
            maxLength: 50,
            description: 'Contact_Person: Name of contact representative'
          }
        }
      }
    },
    indexes: [{ key: { Supplier_ID: 1 }, options: { unique: true } }]
  },

  // Table 3: Branch
  branches: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Branch_ID', 'Location'],
        properties: {
          Branch_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Branch_ID: Integer identifier (PK)'
          },
          Location: {
            bsonType: 'string',
            maxLength: 100,
            description: 'Location: City/Location string'
          },
          Phone: {
            bsonType: ['string', 'null'],
            maxLength: 15,
            description: 'Phone: Branch telephone'
          }
        }
      }
    },
    indexes: [{ key: { Branch_ID: 1 }, options: { unique: true } }]
  },

  // Table 10: Customer
  customers: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Cust_ID', 'Name'],
        properties: {
          Cust_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Cust_ID: Integer customer ID (PK)'
          },
          Name: {
            bsonType: 'string',
            maxLength: 50,
            description: 'Name: Customer full name'
          },
          Phn_No: {
            bsonType: ['string', 'null'],
            maxLength: 15,
            description: 'Phn_No: Customer contact number'
          },
          Email: {
            bsonType: ['string', 'null'],
            maxLength: 50,
            description: 'Email: Customer email address'
          }
        }
      }
    },
    indexes: [{ key: { Cust_ID: 1 }, options: { unique: true } }]
  },

  // Table 9: Product
  products: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Product_ID', 'Name', 'Category_ID', 'Base_Price', 'Tax'],
        properties: {
          Product_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Product_ID: Integer identifier (PK)'
          },
          Tax: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Tax: Percentage rate (e.g., 5.00, 12.00, 18.00)'
          },
          Name: {
            bsonType: 'string',
            maxLength: 50,
            description: 'Name: Product name'
          },
          Category_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Category_ID: Reference to Category (FK)'
          },
          Base_Price: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Base_Price: Numeric base price'
          }
        }
      }
    },
    indexes: [
      { key: { Product_ID: 1 }, options: { unique: true } },
      { key: { Category_ID: 1 } },
      { key: { Base_Price: 1 } }
    ]
  },

  // Table 8: Employee
  employees: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Emp_ID', 'Name', 'Role', 'Branch_ID'],
        properties: {
          Emp_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Emp_ID: Integer identifier (PK)'
          },
          Name: {
            bsonType: 'string',
            maxLength: 50,
            description: 'Name: Employee name'
          },
          Role: {
            bsonType: 'string',
            maxLength: 30,
            description: 'Role: Cashier, Manager, Stock Manager, etc.'
          },
          Salary: {
            bsonType: ['double', 'int', 'long', 'decimal', 'null'],
            description: 'Salary: Monthly salary amount'
          },
          Shift: {
            bsonType: ['string', 'null'],
            maxLength: 20,
            description: 'Shift: Morning, Evening, etc.'
          },
          Branch_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Branch_ID: Branch reference (FK)'
          }
        }
      }
    },
    indexes: [
      { key: { Emp_ID: 1 }, options: { unique: true } },
      { key: { Branch_ID: 1 } }
    ]
  },

  // Table 1: Batch_Inventory
  batch_inventory: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'Batch_Number',
          'Product_ID',
          'Supplier_ID',
          'Branch_ID',
          'Stock_qty',
          'Cost_Price',
          'Selling_Price'
        ],
        properties: {
          Batch_Number: {
            bsonType: ['int', 'long', 'double'],
            description: 'Batch_Number: Integer batch tracking number (PK)'
          },
          Product_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Product_ID: Reference to Product (FK)'
          },
          Supplier_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Supplier_ID: Reference to Supplier (FK)'
          },
          Branch_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Branch_ID: Reference to Branch (FK)'
          },
          Mfg_date: {
            bsonType: ['string', 'date', 'null'],
            description: 'Mfg_date: Manufacturing date'
          },
          Exp_date: {
            bsonType: ['string', 'date', 'null'],
            description: 'Exp_date: Expiration date'
          },
          Reorder_level: {
            bsonType: ['int', 'long', 'double', 'null'],
            description: 'Reorder_level: Minimum stock threshold'
          },
          Stock_qty: {
            bsonType: ['int', 'long', 'double'],
            minimum: 0,
            description: 'Stock_qty: Available inventory units (>= 0)'
          },
          Cost_Price: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Cost_Price: Procurement cost per unit'
          },
          Selling_Price: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Selling_Price: Retail selling price per unit'
          }
        }
      }
    },
    indexes: [
      { key: { Batch_Number: 1 }, options: { unique: true } },
      { key: { Product_ID: 1 } },
      { key: { Supplier_ID: 1 } },
      { key: { Branch_ID: 1 } }
    ]
  },

  // Table 4: Bill_Transaction (Embedding Table 6: Bill_Items)
  bills: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'Bill_No',
          'Cust_ID',
          'Emp_ID',
          'Gross_Amt',
          'Discount',
          'Net_Amt',
          'items'
        ],
        properties: {
          Bill_No: {
            bsonType: ['int', 'long', 'double'],
            description: 'Bill_No: Integer invoice number (PK)'
          },
          Cust_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Cust_ID: Reference to Customer (FK)'
          },
          Emp_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Emp_ID: Reference to Employee Cashier (FK)'
          },
          Time: {
            bsonType: ['string', 'date'],
            description: 'Time: Transaction timestamp'
          },
          Gross_Amt: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Gross_Amt: Total before discount'
          },
          Discount: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Discount: Flat discount deducted'
          },
          Net_Amt: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Net_Amt: Final payable amount (Gross_Amt - Discount)'
          },
          items: {
            bsonType: 'array',
            minItems: 1,
            description: 'items: Embedded bill item rows',
            items: {
              bsonType: 'object',
              required: ['Batch_Number', 'Product_ID', 'Quantity_sold', 'Subtotal'],
              properties: {
                Batch_Number: {
                  bsonType: ['int', 'long', 'double'],
                  description: 'Batch_Number: Inventory batch sold from'
                },
                Product_ID: {
                  bsonType: ['int', 'long', 'double'],
                  description: 'Product_ID: Product sold'
                },
                Quantity_sold: {
                  bsonType: ['int', 'long', 'double'],
                  minimum: 1,
                  description: 'Quantity_sold: Number of units'
                },
                Subtotal: {
                  bsonType: ['double', 'int', 'long', 'decimal'],
                  description: 'Subtotal: Line item total amount'
                }
              }
            }
          }
        }
      }
    },
    indexes: [
      { key: { Bill_No: 1 }, options: { unique: true } },
      { key: { Cust_ID: 1 } },
      { key: { Emp_ID: 1 } },
      { key: { Time: -1 } }
    ]
  },

  // Table 6: Bill_Items (Normalized relational view preserved for DA-2 queries & $lookup)
  bill_items: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Bill_No', 'Batch_Number', 'Product_ID', 'Quantity_sold', 'Subtotal'],
        properties: {
          Bill_No: {
            bsonType: ['int', 'long', 'double'],
            description: 'Bill_No: Reference to Bill_Transaction'
          },
          Batch_Number: {
            bsonType: ['int', 'long', 'double'],
            description: 'Batch_Number: Reference to Batch_Inventory'
          },
          Product_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Product_ID: Reference to Product'
          },
          Quantity_sold: {
            bsonType: ['int', 'long', 'double'],
            minimum: 1,
            description: 'Quantity_sold: Number of units sold'
          },
          Subtotal: {
            bsonType: ['double', 'int', 'long', 'decimal'],
            description: 'Subtotal: Calculated line cost'
          }
        }
      }
    },
    indexes: [
      { key: { Bill_No: 1, Batch_Number: 1, Product_ID: 1 }, options: { unique: true } },
      { key: { Bill_No: 1 } },
      { key: { Product_ID: 1 } }
    ]
  },

  // Table 2: Returns
  returns: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Return_ID', 'Return_date', 'Batch_Number'],
        properties: {
          Return_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Return_ID: Primary key'
          },
          Return_date: {
            bsonType: ['string', 'date'],
            description: 'Return_date: Date return was logged'
          },
          Batch_Number: {
            bsonType: ['int', 'long', 'double'],
            description: 'Batch_Number: Batch the product belongs to'
          },
          Quantity_returned: {
            bsonType: ['int', 'long', 'double', 'null'],
            description: 'Quantity_returned: Number of units returned'
          },
          Reason: {
            bsonType: ['string', 'null'],
            description: 'Reason: Return reason'
          }
        }
      }
    },
    indexes: [
      { key: { Return_ID: 1 }, options: { unique: true } },
      { key: { Batch_Number: 1 } }
    ]
  },

  // Table 11: Employs
  employs: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['Branch_ID', 'Emp_ID', 'Since'],
        properties: {
          Branch_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Branch_ID: Foreign key to Branch'
          },
          Emp_ID: {
            bsonType: ['int', 'long', 'double'],
            description: 'Emp_ID: Foreign key to Employee'
          },
          Since: {
            bsonType: ['string', 'date'],
            description: 'Since: Start date at branch'
          }
        }
      }
    },
    indexes: [
      { key: { Branch_ID: 1, Emp_ID: 1 }, options: { unique: true } }
    ]
  }
};

// Applies all collections, validators and indexes to the database
async function setupSchema() {
  const db = await connectDB();
  console.log('--- Initializing MongoDB Collections with $jsonSchema Validation ---');

  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map(c => c.name));

  for (const [colName, config] of Object.entries(schemaDefinitions)) {
    if (!existingNames.has(colName)) {
      await db.createCollection(colName, {
        validator: config.validator,
        validationAction: 'error',
        validationLevel: 'strict'
      });
      console.log(`  + Created collection '${colName}' with $jsonSchema validator`);
    } else {
      await db.command({
        collMod: colName,
        validator: config.validator,
        validationAction: 'error',
        validationLevel: 'strict'
      });
      console.log(`  ~ Updated validator for existing collection '${colName}'`);
    }

    // Apply indexes
    if (config.indexes && config.indexes.length > 0) {
      for (const idx of config.indexes) {
        await db.collection(colName).createIndex(idx.key, idx.options || {});
      }
    }
  }

  console.log('✓ All 11 collections and $jsonSchema validators configured successfully.');
}

if (require.main === module) {
  setupSchema()
    .then(() => closeDB())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Schema setup failed:', err);
      process.exit(1);
    });
}

module.exports = { setupSchema, schemaDefinitions };
