const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');

// GET /api/employees - List employees with Branch location ($lookup JOIN)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const pipeline = [
      {
        $lookup: {
          from: 'branches',
          localField: 'Branch_ID',
          foreignField: 'Branch_ID',
          as: 'branch'
        }
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          Emp_ID: 1,
          Name: 1,
          Role: 1,
          Salary: 1,
          Shift: 1,
          Branch_ID: 1,
          Branch_Location: '$branch.Location'
        }
      },
      { $sort: { Emp_ID: 1 } }
    ];
    const list = await db.collection('employees').aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id - Single employee
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const item = await db.collection('employees').findOne({ Emp_ID: id });
    if (!item) return res.status(404).json({ error: `Employee ${id} not found` });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees - Create employee
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    let { Emp_ID, Name, Role, Salary, Shift, Branch_ID, Since } = req.body;
    if (!Name) return res.status(400).json({ error: 'Name is required' });
    if (!Role) return res.status(400).json({ error: 'Role is required' });
    if (Branch_ID === undefined) return res.status(400).json({ error: 'Branch_ID is required' });

    Branch_ID = parseInt(Branch_ID, 10);
    const branch = await db.collection('branches').findOne({ Branch_ID });
    if (!branch) return res.status(400).json({ error: `Branch_ID ${Branch_ID} does not exist.` });

    if (!Emp_ID) {
      const last = await db.collection('employees').find().sort({ Emp_ID: -1 }).limit(1).toArray();
      Emp_ID = last.length > 0 ? last[0].Emp_ID + 1 : 401;
    } else {
      Emp_ID = parseInt(Emp_ID, 10);
    }

    const doc = {
      Emp_ID,
      Name: String(Name).trim(),
      Role: String(Role).trim(),
      Salary: Salary !== undefined ? parseFloat(Salary) : 25000.0,
      Shift: Shift ? String(Shift).trim() : 'Morning',
      Branch_ID
    };

    await db.collection('employees').insertOne(doc);

    // Maintain Employs relation (DA-2 Table 11)
    const startDate = Since || new Date().toISOString().split('T')[0];
    await db.collection('employs').updateOne(
      { Branch_ID, Emp_ID },
      { $set: { Branch_ID, Emp_ID, Since: startDate } },
      { upsert: true }
    );

    res.status(201).json({ message: 'Employee created successfully', employee: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Emp_ID already exists' });
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const { Name, Role, Salary, Shift, Branch_ID } = req.body;

    const updateFields = {};
    if (Name !== undefined) updateFields.Name = String(Name).trim();
    if (Role !== undefined) updateFields.Role = String(Role).trim();
    if (Salary !== undefined) updateFields.Salary = parseFloat(Salary);
    if (Shift !== undefined) updateFields.Shift = String(Shift).trim();
    if (Branch_ID !== undefined) {
      const bId = parseInt(Branch_ID, 10);
      const branch = await db.collection('branches').findOne({ Branch_ID: bId });
      if (!branch) return res.status(400).json({ error: `Branch_ID ${bId} does not exist.` });
      updateFields.Branch_ID = bId;
    }

    const result = await db.collection('employees').updateOne({ Emp_ID: id }, { $set: updateFields });
    if (result.matchedCount === 0) return res.status(404).json({ error: `Employee ${id} not found` });

    const updated = await db.collection('employees').findOne({ Emp_ID: id });
    res.json({ message: 'Employee updated successfully', employee: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const id = parseInt(req.params.id, 10);
    const bills = await db.collection('bills').countDocuments({ Emp_ID: id });
    if (bills > 0) return res.status(400).json({ error: `Cannot delete employee: ${bills} bill(s) processed by this employee.` });

    await db.collection('employs').deleteMany({ Emp_ID: id });
    const result = await db.collection('employees').deleteOne({ Emp_ID: id });
    if (result.deletedCount === 0) return res.status(404).json({ error: `Employee ${id} not found` });
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
