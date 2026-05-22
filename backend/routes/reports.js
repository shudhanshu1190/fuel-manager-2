import express from 'express';
import Sale from '../models/Sale.js';
import CounterTransaction from '../models/CounterTransaction.js';
import CreditLedger from '../models/CreditLedger.js';
import CreditPayment from '../models/CreditPayment.js';
import Shift from '../models/Shift.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to resolve date range query
const getDateRangeFilter = (startDateStr, endDateStr) => {
  const filter = {};
  if (startDateStr || endDateStr) {
    filter.$gte = startDateStr ? new Date(startDateStr) : new Date(0); // Epoch start
    filter.$lte = endDateStr ? new Date(endDateStr) : new Date(); // Now
  }
  return filter;
};

// 1. Daily Sales Report API
router.get('/sales', protect, async (req, res) => {
  const { shiftId, startDate, endDate } = req.query;
  const filter = {};

  if (shiftId) {
    filter.shiftId = shiftId;
  } else if (startDate || endDate) {
    filter.createdAt = getDateRangeFilter(startDate, endDate);
  }

  try {
    const sales = await Sale.find(filter).sort({ createdAt: 1 });
    
    // Aggregate totals
    const summary = {
      msQty: 0,
      msSale: 0,
      msTestingQty: 0,
      hsdQty: 0,
      hsdSale: 0,
      hsdTestingQty: 0,
      finalTotalSale: 0,
      testingTotalAmount: 0,
      cashAmount: 0,
      upiAmount: 0,
      creditAmount: 0,
      posAmount: 0,
    };

    sales.forEach((s) => {
      summary.msQty += s.ms.quantity;
      summary.msSale += s.ms.totalSale;
      summary.msTestingQty += s.ms.testingQuantity || 0;
      summary.hsdQty += s.hsd.quantity;
      summary.hsdSale += s.hsd.totalSale;
      summary.hsdTestingQty += s.hsd.testingQuantity || 0;
      summary.finalTotalSale += s.finalTotalSale;
      summary.testingTotalAmount += s.testingTotalAmount || 0;
      summary.cashAmount += s.paymentBreakup.cashAmount || 0;
      summary.upiAmount += s.paymentBreakup.upiAmount || 0;
      summary.creditAmount += s.paymentBreakup.creditAmount || 0;
      summary.posAmount += s.paymentBreakup.posAmount || 0;
    });

    res.json({ sales, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling sales report', error: error.message });
  }
});

// 2. Counter Balance Cash Flow Report API
router.get('/counter', protect, async (req, res) => {
  const { shiftId, startDate, endDate } = req.query;
  const filter = {};

  if (shiftId) {
    filter.shiftId = shiftId;
  } else if (startDate || endDate) {
    filter.createdAt = getDateRangeFilter(startDate, endDate);
  }

  try {
    const transactions = await CounterTransaction.find(filter)
      .sort({ createdAt: 1 })
      .populate('enteredBy', 'name');

    // Compile groupings
    const summary = {
      freshCashSales: 0,
      returnCreditCash: 0,
      cashTransfers: 0,
      bankDeposits: 0,
      expenses: 0,
      netOutflow: 0,
      netInflow: 0,
    };

    transactions.forEach((tx) => {
      if (tx.type === 'Fresh Cash Sale') summary.freshCashSales += tx.amount;
      else if (tx.type === 'Return Credit Cash') summary.returnCreditCash += tx.amount;
      else if (tx.type === 'Cash Transfer') summary.cashTransfers += tx.amount;
      else if (tx.type === 'Bank Deposit') summary.bankDeposits += tx.amount;
      else if (tx.type === 'Expense') summary.expenses += tx.amount;
    });

    summary.netInflow = summary.freshCashSales + summary.returnCreditCash;
    summary.netOutflow = summary.cashTransfers + summary.bankDeposits + summary.expenses;

    res.json({ transactions, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling counter report', error: error.message });
  }
});

// 3. Credit Issued Report API
router.get('/credit', protect, async (req, res) => {
  const { shiftId, startDate, endDate, status } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (shiftId) {
    filter.shiftId = shiftId;
  } else if (startDate || endDate) {
    filter.date = getDateRangeFilter(startDate, endDate);
  }

  try {
    const credits = await CreditLedger.find(filter)
      .sort({ date: 1 })
      .populate('createdBy', 'name');

    const summary = {
      totalAmountIssued: 0,
      totalRemainingBalance: 0,
      totalPaid: 0,
      pendingCount: 0,
      paidCount: 0,
    };

    credits.forEach((c) => {
      summary.totalAmountIssued += c.amount;
      summary.totalRemainingBalance += c.remainingBalance;
      if (c.status === 'Paid') summary.paidCount++;
      else summary.pendingCount++;
    });

    summary.totalPaid = summary.totalAmountIssued - summary.totalRemainingBalance;

    res.json({ credits, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling credit report', error: error.message });
  }
});

// 4. Credit Recovery (Payments Recieved) Report API
router.get('/recovery', protect, async (req, res) => {
  const { shiftId, startDate, endDate } = req.query;
  const filter = {};

  if (shiftId) {
    filter.shiftId = shiftId;
  } else if (startDate || endDate) {
    filter.date = getDateRangeFilter(startDate, endDate);
  }

  try {
    const recoveries = await CreditPayment.find(filter)
      .sort({ date: 1 })
      .populate('creditLedgerId', 'customerName vehicleNumber mobileNumber')
      .populate('receiver', 'name');

    const summary = {
      totalRecovered: 0,
      cash: 0,
      upi: 0,
      pos: 0,
    };

    recoveries.forEach((r) => {
      summary.totalRecovered += r.amountPaid;
      if (r.paymentMode === 'Cash') summary.cash += r.amountPaid;
      else if (r.paymentMode === 'UPI') summary.upi += r.amountPaid;
      else if (r.paymentMode === 'POS') summary.pos += r.amountPaid;
    });

    res.json({ recoveries, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error compiling credit recovery report', error: error.message });
  }
});

// 5. Salesman Wise Report API
router.get('/salesman-wise', protect, async (req, res) => {
  const { shiftId, startDate, endDate } = req.query;
  const saleFilter = {};
  const creditFilter = {};

  if (shiftId) {
    saleFilter.shiftId = shiftId;
    creditFilter.shiftId = shiftId;
  } else if (startDate || endDate) {
    saleFilter.createdAt = getDateRangeFilter(startDate, endDate);
    creditFilter.date = getDateRangeFilter(startDate, endDate);
  }

  try {
    const sales = await Sale.find(saleFilter);
    const credits = await CreditLedger.find(creditFilter);

    // Grouping structure: { [salesmanName]: { totalSales: 0, cash: 0, upi: 0, pos: 0, credit: 0, creditsIssued: 0 } }
    const groupings = {};

    sales.forEach((s) => {
      const name = s.salesmanName;
      if (!groupings[name]) {
        groupings[name] = {
          salesmanName: name,
          totalSales: 0,
          cash: 0,
          upi: 0,
          pos: 0,
          credit: 0,
          creditsCount: 0,
        };
      }
      groupings[name].totalSales += s.finalTotalSale;
      groupings[name].cash += s.paymentBreakup.cashAmount || 0;
      groupings[name].upi += s.paymentBreakup.upiAmount || 0;
      groupings[name].pos += s.paymentBreakup.posAmount || 0;
      groupings[name].credit += s.paymentBreakup.creditAmount || 0;
    });

    // Merge credits
    credits.forEach((c) => {
      const name = c.salesmanName;
      if (!groupings[name]) {
        groupings[name] = {
          salesmanName: name,
          totalSales: 0,
          cash: 0,
          upi: 0,
          pos: 0,
          credit: 0,
          creditsCount: 0,
        };
      }
      groupings[name].creditsCount++;
    });

    res.json(Object.values(groupings));
  } catch (error) {
    res.status(500).json({ message: 'Error compiling salesman report', error: error.message });
  }
});

// 6. Shift Closing Report (Metrics aggregated across shift history)
router.get('/shifts', protect, async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};

  if (startDate || endDate) {
    filter.startTime = getDateRangeFilter(startDate, endDate);
  }

  try {
    const shifts = await Shift.find(filter)
      .sort({ shiftNumber: -1 })
      .populate('openedBy', 'name')
      .populate('closedBy', 'name');
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shift close records', error: error.message });
  }
});

export default router;
