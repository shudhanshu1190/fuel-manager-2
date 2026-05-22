import express from 'express';
import Shift from '../models/Shift.js';
import CounterTransaction from '../models/CounterTransaction.js';
import Sale from '../models/Sale.js';
import CreditPayment from '../models/CreditPayment.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// Helper to calculate shift summary/metrics
export const calculateShiftBalance = async (shift) => {
  const transactions = await CounterTransaction.find({ shiftId: shift._id });
  
  let freshCashSales = 0;
  let returnCreditCash = 0;
  let cashTransfers = 0;
  let bankDeposits = 0;
  let expenses = 0;

  transactions.forEach((tx) => {
    switch (tx.type) {
      case 'Fresh Cash Sale':
        freshCashSales += tx.amount;
        break;
      case 'Return Credit Cash':
        returnCreditCash += tx.amount;
        break;
      case 'Cash Transfer':
        cashTransfers += tx.amount;
        break;
      case 'Bank Deposit':
        bankDeposits += tx.amount;
        break;
      case 'Expense':
        expenses += tx.amount;
        break;
    }
  });

  const expectedCash = shift.startCash + freshCashSales + returnCreditCash - cashTransfers - bankDeposits - expenses;
  return {
    freshCashSales,
    returnCreditCash,
    cashTransfers,
    bankDeposits,
    expenses,
    expectedCash,
  };
};

// Get the current active open shift
router.get('/active', protect, async (req, res) => {
  try {
    let shift = await Shift.findOne({ status: 'Open' }).populate('openedBy', 'name role');
    if (!shift) {
      return res.json({ active: false });
    }

    const balanceMetrics = await calculateShiftBalance(shift);

    res.json({
      active: true,
      shift,
      ...balanceMetrics,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active shift', error: error.message });
  }
});

// Open a new shift
router.post('/open', protect, restrictTo('Owner', 'Manager'), async (req, res) => {
  const { startCash, remarks } = req.body;

  if (startCash === undefined || startCash < 0) {
    return res.status(400).json({ message: 'Please specify a valid starting cash balance' });
  }

  try {
    const existingShift = await Shift.findOne({ status: 'Open' });
    if (existingShift) {
      return res.status(400).json({ message: 'A shift is already open. Close it first before opening a new one.' });
    }

    const lastShift = await Shift.findOne().sort({ shiftNumber: -1 });
    const nextShiftNumber = lastShift ? lastShift.shiftNumber + 1 : 1;

    const shift = await Shift.create({
      shiftNumber: nextShiftNumber,
      startCash,
      openedBy: req.user._id,
      remarks,
    });

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Open Shift',
      entityName: 'Shift',
      entityId: shift._id,
      oldValue: null,
      newValue: { shiftNumber: shift.shiftNumber, startCash },
      remarks: `Shift opened with starting cash: ₹${startCash}`,
    });

    res.status(201).json({ message: 'Shift opened successfully', shift });
  } catch (error) {
    res.status(500).json({ message: 'Error opening shift', error: error.message });
  }
});

// Close active shift
router.post('/close', protect, restrictTo('Owner', 'Manager'), async (req, res) => {
  const { endCash, remarks } = req.body;

  if (endCash === undefined || endCash < 0) {
    return res.status(400).json({ message: 'Please specify a valid closing cash balance' });
  }

  try {
    const shift = await Shift.findOne({ status: 'Open' });
    if (!shift) {
      return res.status(404).json({ message: 'No active shift found to close' });
    }

    const { expectedCash } = await calculateShiftBalance(shift);
    const cashDifference = endCash - expectedCash;

    shift.status = 'Closed';
    shift.endCash = endCash;
    shift.endTime = new Date();
    shift.closedBy = req.user._id;
    shift.remarks = remarks ? `${shift.remarks || ''}\nClosing remarks: ${remarks}` : shift.remarks;

    await shift.save();

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Close Shift',
      entityName: 'Shift',
      entityId: shift._id,
      oldValue: { status: 'Open' },
      newValue: { status: 'Closed', endCash, expectedCash, cashDifference },
      remarks: `Shift closed. Declared Cash: ₹${endCash}, Expected: ₹${expectedCash}, Diff: ₹${cashDifference}`,
    });

    res.json({
      message: 'Shift closed successfully',
      shift,
      expectedCash,
      cashDifference,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error closing shift', error: error.message });
  }
});

// Reopen a closed shift (Owner only)
router.post('/:id/reopen', protect, restrictTo('Owner'), async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    if (shift.status === 'Open') {
      return res.status(400).json({ message: 'Shift is already open' });
    }

    // Check if there is already another shift open
    const openShift = await Shift.findOne({ status: 'Open' });
    if (openShift) {
      return res.status(400).json({
        message: `Cannot reopen shift #${shift.shiftNumber} while shift #${openShift.shiftNumber} is open. Please close shift #${openShift.shiftNumber} first.`,
      });
    }

    shift.status = 'Open';
    shift.endTime = undefined;
    shift.closedBy = undefined;
    await shift.save();

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Reopen Shift',
      entityName: 'Shift',
      entityId: shift._id,
      oldValue: { status: 'Closed' },
      newValue: { status: 'Open' },
      remarks: `Shift #${shift.shiftNumber} reopened by Owner`,
    });

    res.json({ message: `Shift #${shift.shiftNumber} reopened successfully`, shift });
  } catch (error) {
    res.status(500).json({ message: 'Error reopening shift', error: error.message });
  }
});

// Get shift list (for closing history log)
router.get('/history', protect, async (req, res) => {
  try {
    const shifts = await Shift.find()
      .sort({ shiftNumber: -1 })
      .populate('openedBy', 'name')
      .populate('closedBy', 'name');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shift history', error: error.message });
  }
});

export default router;
