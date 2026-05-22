import express from 'express';
import CreditLedger from '../models/CreditLedger.js';
import CreditPayment from '../models/CreditPayment.js';
import CounterTransaction from '../models/CounterTransaction.js';
import { protect, requireOpenShift } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// Get credit ledger entries (with robust query filtering and search)
router.get('/', protect, async (req, res) => {
  const { search, status, shiftId, startDate, endDate } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (shiftId) {
    filter.shiftId = shiftId;
  }

  // Handle text search on Customer Name, Mobile, Vehicle, or Salesman
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { customerName: searchRegex },
      { mobileNumber: searchRegex },
      { vehicleNumber: searchRegex },
      { salesmanName: searchRegex },
    ];
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  try {
    const records = await CreditLedger.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching credit ledger', error: error.message });
  }
});

// Create manual Credit Entry (ad-hoc, associated with active open shift)
router.post('/', protect, requireOpenShift, async (req, res) => {
  const { customerName, mobileNumber, vehicleNumber, amount, salesmanName, notes } = req.body;

  if (!customerName || !mobileNumber || !vehicleNumber || amount === undefined || amount <= 0 || !salesmanName) {
    return res.status(400).json({ message: 'Missing required credit fields' });
  }

  try {
    const activeShift = req.activeShift;

    const credit = new CreditLedger({
      customerName,
      mobileNumber,
      vehicleNumber,
      amount,
      remainingBalance: amount,
      salesmanName,
      notes,
      shiftId: activeShift._id,
      createdBy: req.user._id,
    });

    await credit.save();

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Create Credit Record',
      entityName: 'CreditLedger',
      entityId: credit._id,
      oldValue: null,
      newValue: credit.toObject(),
      remarks: `Direct credit issued to customer ${customerName} (Vehicle: ${vehicleNumber}): ₹${amount}`,
    });

    res.status(201).json({ message: 'Credit record created successfully', credit });
  } catch (error) {
    res.status(500).json({ message: 'Error creating credit record', error: error.message });
  }
});

// Receive Payment for a credit record (affects active open shift counter)
router.post('/:id/pay', protect, requireOpenShift, async (req, res) => {
  const { amountPaid, paymentMode, remarks } = req.body;

  if (amountPaid === undefined || amountPaid <= 0) {
    return res.status(400).json({ message: 'Please specify a valid payment amount (> 0)' });
  }

  try {
    const credit = await CreditLedger.findById(req.params.id);
    if (!credit) {
      return res.status(404).json({ message: 'Credit record not found' });
    }

    if (credit.remainingBalance <= 0) {
      return res.status(400).json({ message: 'This credit account is already fully paid' });
    }

    if (amountPaid > credit.remainingBalance) {
      return res.status(400).json({
        message: `Amount paid (₹${amountPaid}) cannot exceed remaining balance (₹${credit.remainingBalance})`,
      });
    }

    const activeShift = req.activeShift;
    const oldCreditObj = credit.toObject();

    // Create the Credit Payment
    const payment = new CreditPayment({
      creditLedgerId: credit._id,
      amountPaid,
      paymentMode: paymentMode || 'Cash',
      receiver: req.user._id,
      shiftId: activeShift._id,
      remarks: remarks || 'Credit payment recovery',
    });

    await payment.save();

    // Update Credit Ledger balance and status
    credit.remainingBalance -= amountPaid;
    if (credit.remainingBalance <= 0) {
      credit.status = 'Paid';
      credit.remainingBalance = 0;
    } else {
      credit.status = 'Partially Paid';
    }

    await credit.save();

    // If payment is Cash, automatically route it to Return Credit Cash inside counter transactions
    if (paymentMode === 'Cash') {
      await CounterTransaction.create({
        type: 'Return Credit Cash',
        amount: amountPaid,
        shiftId: activeShift._id,
        description: `Returned Credit cash from ${credit.customerName} (Vehicle: ${credit.vehicleNumber})`,
        associatedRecordId: payment._id,
        enteredBy: req.user._id,
      });
    }

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Receive Credit Payment',
      entityName: 'CreditLedger',
      entityId: credit._id,
      oldValue: oldCreditObj,
      newValue: credit.toObject(),
      remarks: `Collected ₹${amountPaid} via ${paymentMode} from ${credit.customerName}. Payment ID: ${payment._id}`,
    });

    res.json({
      message: 'Payment received successfully',
      credit,
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error receiving payment', error: error.message });
  }
});

// Get payment history for a specific credit ledger account
router.get('/:id/payments', protect, async (req, res) => {
  try {
    const payments = await CreditPayment.find({ creditLedgerId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('receiver', 'name');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment history', error: error.message });
  }
});

export default router;
