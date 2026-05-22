import mongoose from 'mongoose';

const creditPaymentSchema = new mongoose.Schema(
  {
    creditLedgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreditLedger',
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'POS'],
      default: 'Cash',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const CreditPayment = mongoose.model('CreditPayment', creditPaymentSchema);
export default CreditPayment;
