import express from 'express';
import CounterTransaction from '../models/CounterTransaction.js';
import { protect, requireOpenShift } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// Get list of counter transactions
router.get('/transactions', protect, async (req, res) => {
  const { shiftId, type, startDate, endDate } = req.query;
  const filter = {};

  if (shiftId) filter.shiftId = shiftId;
  if (type) filter.type = type;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  try {
    const transactions = await CounterTransaction.find(filter)
      .sort({ createdAt: -1 })
      .populate('enteredBy', 'name');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// Record a manual cash movement (Expense, Cash Transfer, Bank Deposit)
router.post('/transactions', protect, requireOpenShift, async (req, res) => {
  const { type, amount, description } = req.body;

  const validTypes = ['Cash Transfer', 'Bank Deposit', 'Expense'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      message: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  if (amount === undefined || amount <= 0) {
    return res.status(400).json({ message: 'Please specify a valid transaction amount (> 0)' });
  }

  try {
    const activeShift = req.activeShift;

    const tx = new CounterTransaction({
      type,
      amount,
      shiftId: activeShift._id,
      description: description || `Counter transaction: ${type}`,
      enteredBy: req.user._id,
    });

    await tx.save();

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: `Record ${type}`,
      entityName: 'CounterTransaction',
      entityId: tx._id,
      oldValue: null,
      newValue: tx.toObject(),
      remarks: `Recorded counter cash outflow of ₹${amount} for ${type}: ${description}`,
    });

    res.status(201).json({ message: `${type} recorded successfully`, transaction: tx });
  } catch (error) {
    res.status(500).json({ message: 'Error saving transaction', error: error.message });
  }
});

export default router;
