import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    salesmanName: {
      type: String,
      required: true,
      trim: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    ms: {
      oldReading: { type: Number, required: true },
      closingReading: { type: Number, required: true },
      rate: { type: Number, required: true },
      testingQuantity: { type: Number, default: 0 },
      quantity: { type: Number, required: true },
      totalSale: { type: Number, required: true },
    },
    hsd: {
      oldReading: { type: Number, required: true },
      closingReading: { type: Number, required: true },
      rate: { type: Number, required: true },
      testingQuantity: { type: Number, default: 0 },
      quantity: { type: Number, required: true },
      totalSale: { type: Number, required: true },
    },
    paymentBreakup: {
      cashAmount: { type: Number, default: 0 },
      upiAmount: { type: Number, default: 0 },
      creditAmount: { type: Number, default: 0 },
      posAmount: { type: Number, default: 0 },
    },
    finalTotalSale: {
      type: Number,
      required: true,
    },
    testingTotalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Approved', 'PendingApproval'],
      default: 'Approved',
    },
    mismatchDetails: {
      isMismatch: { type: Boolean, default: false },
      difference: { type: Number, default: 0 },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      approvalRemarks: { type: String },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;
