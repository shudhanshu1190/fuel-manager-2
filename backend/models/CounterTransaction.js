import mongoose from 'mongoose';

const counterTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'Fresh Cash Sale',
        'Return Credit Cash',
        'Cash Transfer',
        'Bank Deposit',
        'Expense',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    associatedRecordId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const CounterTransaction = mongoose.model('CounterTransaction', counterTransactionSchema);
export default CounterTransaction;
