import express from 'express';
import Sale from '../models/Sale.js';
import Shift from '../models/Shift.js';
import CounterTransaction from '../models/CounterTransaction.js';
import CreditLedger from '../models/CreditLedger.js';
import { protect, restrictTo, requireOpenShift, checkShiftLock } from '../middleware/auth.js';
import { logAudit } from '../utils/logger.js';

const router = express.Router();

// Helper to validate payment breakup
const validatePaymentBreakup = (saleData) => {
  const { ms, hsd, paymentBreakup } = saleData;

  const msQty = ms.closingReading - ms.oldReading;
  const hsdQty = hsd.closingReading - hsd.oldReading;

  if (msQty < 0 || hsdQty < 0) {
    throw new Error('Closing reading cannot be less than old reading');
  }

  const msSale = msQty * ms.rate;
  const hsdSale = hsdQty * hsd.rate;
  const finalTotalSale = msSale + hsdSale;

  const msTestingAmt = (ms.testingQuantity || 0) * ms.rate;
  const hsdTestingAmt = (hsd.testingQuantity || 0) * hsd.rate;
  const testingTotalAmount = msTestingAmt + hsdTestingAmt;

  const paidAmt =
    (paymentBreakup.cashAmount || 0) +
    (paymentBreakup.upiAmount || 0) +
    (paymentBreakup.creditAmount || 0) +
    (paymentBreakup.posAmount || 0);

  const totalCalculated = paidAmt + testingTotalAmount;
  const difference = finalTotalSale - totalCalculated;

  return {
    msQty,
    hsdQty,
    msSale,
    hsdSale,
    finalTotalSale,
    testingTotalAmount,
    difference,
    isMismatch: Math.abs(difference) > 0.01,
  };
};

// Create a new sales entry
router.post('/', protect, requireOpenShift, async (req, res) => {
  const { salesmanName, ms, hsd, paymentBreakup, credits, overrideMismatch, remarks } = req.body;

  if (!salesmanName || !ms || !hsd || !paymentBreakup) {
    return res.status(400).json({ message: 'Missing required sales fields' });
  }

  try {
    const activeShift = req.activeShift;

    // Validate calculations
    let calc;
    try {
      calc = validatePaymentBreakup({ ms, hsd, paymentBreakup });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const { msQty, hsdQty, msSale, hsdSale, finalTotalSale, testingTotalAmount, difference, isMismatch } = calc;

    // Check if there is a payment mismatch
    let saleStatus = 'Approved';
    let mismatchDetails = { isMismatch: false, difference: 0 };

    if (isMismatch) {
      mismatchDetails = { isMismatch: true, difference };
      
      // If mismatch, prevent save unless approved
      if (req.user.role === 'Owner') {
        if (!overrideMismatch) {
          return res.status(400).json({
            message: `Warning: Payment breakup mismatch of ₹${difference.toFixed(2)}. As an Owner, you can override and save, but you must acknowledge it.`,
            isMismatch: true,
            difference,
          });
        }
        saleStatus = 'Approved';
        mismatchDetails.approvedBy = req.user._id;
        mismatchDetails.approvedAt = new Date();
        mismatchDetails.approvalRemarks = remarks || 'Approved by Owner during entry';
      } else {
        // Prevent manager/salesman from saving a mismatch
        return res.status(400).json({
          message: `Payment breakup mismatch of ₹${difference.toFixed(2)} is not allowed. Sales save is blocked. Please contact the Owner to approve this correction.`,
          isMismatch: true,
          difference,
        });
      }
    }

    // Verify credit breakup if creditAmount > 0
    const creditAmount = paymentBreakup.creditAmount || 0;
    if (creditAmount > 0) {
      if (!credits || !Array.isArray(credits) || credits.length === 0) {
        return res.status(400).json({ message: 'Please provide customer details for the credit amount.' });
      }
      const totalCreditsEntered = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
      if (Math.abs(totalCreditsEntered - creditAmount) > 0.01) {
        return res.status(400).json({
          message: `The sum of credit ledger entries (₹${totalCreditsEntered}) must match the payment breakup credit amount (₹${creditAmount}).`,
        });
      }
    }

    // Create the Sale
    const sale = new Sale({
      salesmanName,
      shiftId: activeShift._id,
      ms: { ...ms, quantity: msQty, totalSale: msSale },
      hsd: { ...hsd, quantity: hsdQty, totalSale: hsdSale },
      paymentBreakup,
      finalTotalSale,
      testingTotalAmount,
      status: saleStatus,
      mismatchDetails,
      createdBy: req.user._id,
    });

    await sale.save();

    // Create Credit Ledger entries if present
    if (creditAmount > 0 && credits) {
      for (const cred of credits) {
        await CreditLedger.create({
          customerName: cred.customerName,
          mobileNumber: cred.mobileNumber,
          vehicleNumber: cred.vehicleNumber,
          amount: cred.amount,
          remainingBalance: cred.amount,
          salesmanName: salesmanName,
          notes: cred.notes,
          shiftId: activeShift._id,
          createdBy: req.user._id,
        });
      }
    }

    // Automatically move Cash to Counter Cash Balance (Create CounterTransaction)
    if (paymentBreakup.cashAmount > 0) {
      await CounterTransaction.create({
        type: 'Fresh Cash Sale',
        amount: paymentBreakup.cashAmount,
        shiftId: activeShift._id,
        description: `Sales Entry Cash component (Salesman: ${salesmanName})`,
        associatedRecordId: sale._id,
        enteredBy: req.user._id,
      });
    }

    await logAudit({
      userId: req.user._id,
      username: req.user.username,
      action: 'Create Sale',
      entityName: 'Sale',
      entityId: sale._id,
      oldValue: null,
      newValue: sale.toObject(),
      remarks: `Recorded fuel sale: ₹${finalTotalSale.toFixed(2)}. MS Qty: ${msQty.toFixed(2)}, HSD Qty: ${hsdQty.toFixed(2)}. Status: ${saleStatus}`,
    });

    res.status(201).json({ message: 'Sales entry saved successfully', sale });
  } catch (error) {
    res.status(500).json({ message: 'Error saving sales entry', error: error.message });
  }
});

// Get sales list (filtered by shift or date range)
router.get('/', protect, async (req, res) => {
  const { shiftId, startDate, endDate, salesman } = req.query;
  const filter = {};

  if (shiftId) filter.shiftId = shiftId;
  if (salesman) filter.salesmanName = new RegExp(salesman, 'i');

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  try {
    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales entries', error: error.message });
  }
});

// Edit a sale (Manager/Owner only, Salesman cannot edit, and blocked if shift is closed unless Owner)
router.put(
  '/:id',
  protect,
  restrictTo('Owner', 'Manager'),
  checkShiftLock(async (req) => {
    const sale = await Sale.findById(req.params.id);
    return sale ? sale.shiftId : null;
  }),
  async (req, res) => {
    const { salesmanName, ms, hsd, paymentBreakup, overrideMismatch, remarks } = req.body;

    try {
      const sale = await Sale.findById(req.params.id);
      if (!sale) {
        return res.status(404).json({ message: 'Sales record not found' });
      }

      // Re-validate calculations
      let calc;
      try {
        calc = validatePaymentBreakup({ ms, hsd, paymentBreakup });
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      const { msQty, hsdQty, msSale, hsdSale, finalTotalSale, testingTotalAmount, difference, isMismatch } = calc;

      let saleStatus = 'Approved';
      let mismatchDetails = { isMismatch: false, difference: 0 };

      if (isMismatch) {
        mismatchDetails = { isMismatch: true, difference };
        if (req.user.role === 'Owner') {
          if (!overrideMismatch) {
            return res.status(400).json({
              message: `Warning: Payment breakup mismatch of ₹${difference.toFixed(2)}. Re-save requires override checkbox confirmation.`,
              isMismatch: true,
              difference,
            });
          }
          saleStatus = 'Approved';
          mismatchDetails.approvedBy = req.user._id;
          mismatchDetails.approvedAt = new Date();
          mismatchDetails.approvalRemarks = remarks || 'Approved by Owner during correction';
        } else {
          return res.status(400).json({
            message: `Correction would result in a mismatch of ₹${difference.toFixed(2)}. Only the Owner can approve entries with mismatches.`,
            isMismatch: true,
            difference,
          });
        }
      }

      const oldSaleObj = sale.toObject();

      // Update sale values
      sale.salesmanName = salesmanName;
      sale.ms = { ...ms, quantity: msQty, totalSale: msSale };
      sale.hsd = { ...hsd, quantity: hsdQty, totalSale: hsdSale };
      sale.paymentBreakup = paymentBreakup;
      sale.finalTotalSale = finalTotalSale;
      sale.testingTotalAmount = testingTotalAmount;
      sale.status = saleStatus;
      sale.mismatchDetails = mismatchDetails;
      sale.updatedBy = req.user._id;

      await sale.save();

      // Correct associated cash transaction in counter balance
      const existingTx = await CounterTransaction.findOne({
        type: 'Fresh Cash Sale',
        associatedRecordId: sale._id,
      });

      if (existingTx) {
        if (paymentBreakup.cashAmount > 0) {
          existingTx.amount = paymentBreakup.cashAmount;
          await existingTx.save();
        } else {
          await CounterTransaction.findByIdAndDelete(existingTx._id);
        }
      } else if (paymentBreakup.cashAmount > 0) {
        await CounterTransaction.create({
          type: 'Fresh Cash Sale',
          amount: paymentBreakup.cashAmount,
          shiftId: sale.shiftId,
          description: `Sales Entry Cash component (Updated by: ${req.user.name})`,
          associatedRecordId: sale._id,
          enteredBy: req.user._id,
        });
      }

      await logAudit({
        userId: req.user._id,
        username: req.user.username,
        action: 'Update Sale',
        entityName: 'Sale',
        entityId: sale._id,
        oldValue: oldSaleObj,
        newValue: sale.toObject(),
        remarks: remarks || `Sales entry corrected by ${req.user.role} (${req.user.name})`,
      });

      res.json({ message: 'Sales entry updated successfully', sale });
    } catch (error) {
      res.status(500).json({ message: 'Error updating sales entry', error: error.message });
    }
  }
);

export default router;
