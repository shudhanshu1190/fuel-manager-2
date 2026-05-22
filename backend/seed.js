import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Shift from './models/Shift.js';
import Sale from './models/Sale.js';
import CreditLedger from './models/CreditLedger.js';
import CreditPayment from './models/CreditPayment.js';
import CounterTransaction from './models/CounterTransaction.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fuelledger';

const seedData = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected.');

    // Clear existing data
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Shift.deleteMany({});
    await Sale.deleteMany({});
    await CreditLedger.deleteMany({});
    await CreditPayment.deleteMany({});
    await CounterTransaction.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Collections cleared.');

    // Create seed users
    console.log('Seeding users...');
    const owner = await User.create({
      name: 'Rajesh Sharma (Owner)',
      username: 'owner',
      password: 'password123', // Will be hashed by pre-save middleware
      role: 'Owner',
    });

    const manager = await User.create({
      name: 'Amit Patel (Manager)',
      username: 'manager',
      password: 'password123',
      role: 'Manager',
    });

    const salesman = await User.create({
      name: 'Sanjeev Kumar (Salesman)',
      username: 'salesman',
      password: 'password123',
      role: 'Salesman',
    });

    const counter = await User.create({
      name: 'Sunita Devi (Counter Op)',
      username: 'counter',
      password: 'password123',
      role: 'Counter Operator',
    });

    console.log('Users seeded successfully!');
    console.log('Default credentials (username / password):');
    console.log('-------------------------------------------');
    console.log(`- Owner:    owner    / password123`);
    console.log(`- Manager:  manager  / password123`);
    console.log(`- Salesman: salesman / password123`);
    console.log(`- Counter:  counter  / password123`);
    console.log('-------------------------------------------');

    // Create a historical closed shift to show data in reports
    console.log('Seeding dummy shift & transactions...');
    const oldShift = await Shift.create({
      shiftNumber: 1,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2), // 2 days ago
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2 + 8 * 60 * 60 * 1000), // + 8 hours
      status: 'Closed',
      openedBy: owner._id,
      closedBy: manager._id,
      startCash: 5000,
      endCash: 45000,
      remarks: 'Standard shift closed. Mismatch handled.',
    });

    // Create seed sales for shift 1
    const sale1 = await Sale.create({
      salesmanName: 'Sanjeev Kumar',
      shiftId: oldShift._id,
      ms: {
        oldReading: 12000,
        closingReading: 12150, // 150 L
        rate: 96.5,
        testingQuantity: 5,
        quantity: 150,
        totalSale: 14475,
      },
      hsd: {
        oldReading: 45000,
        closingReading: 45300, // 300 L
        rate: 89.2,
        testingQuantity: 5,
        quantity: 300,
        totalSale: 26760,
      },
      paymentBreakup: {
        cashAmount: 35000,
        upiAmount: 4000,
        creditAmount: 1307, // (150*96.5 + 300*89.2) - (35000+4000) - (5*96.5 + 5*89.2)
        posAmount: 0,
      },
      finalTotalSale: 41235, // 14475 + 26760
      testingTotalAmount: 928.5, // 5 * 96.5 + 5 * 89.2
      status: 'Approved',
      createdBy: salesman._id,
    });

    // Create credit ledger entry for shift 1
    const credit1 = await CreditLedger.create({
      customerName: 'Ragu Transport',
      mobileNumber: '9876543210',
      vehicleNumber: 'KA-01-AB-1234',
      amount: 1307,
      remainingBalance: 307,
      salesmanName: 'Sanjeev Kumar',
      notes: 'Credit approved by Manager',
      status: 'Partially Paid',
      shiftId: oldShift._id,
      createdBy: manager._id,
    });

    // Create partial payment history in shift 2
    // Let's create an active open shift first so there is one
    const activeShift = await Shift.create({
      shiftNumber: 2,
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: 'Open',
      openedBy: manager._id,
      startCash: 45000,
      remarks: 'Morning shift opening',
    });

    // Create cash transactions for shift 1
    await CounterTransaction.create({
      type: 'Fresh Cash Sale',
      amount: 35000,
      shiftId: oldShift._id,
      description: 'Sales Entry Cash component (Salesman: Sanjeev Kumar)',
      associatedRecordId: sale1._id,
      enteredBy: salesman._id,
    });

    // Create payment in active shift 2 for Ragu's credit
    const pay1 = await CreditPayment.create({
      creditLedgerId: credit1._id,
      amountPaid: 1000,
      paymentMode: 'Cash',
      receiver: manager._id,
      shiftId: activeShift._id,
      remarks: 'Ragu partial repayment',
    });

    // Automatically route to Counter Transaction
    await CounterTransaction.create({
      type: 'Return Credit Cash',
      amount: 1000,
      shiftId: activeShift._id,
      description: 'Returned Credit cash from Ragu Transport (Vehicle: KA-01-AB-1234)',
      associatedRecordId: pay1._id,
      enteredBy: manager._id,
    });

    console.log('Seeded initial mock operations (shifts, sales, and counter flow).');
    mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Seeding error:', error.message);
    mongoose.connection.close();
  }
};

seedData();
