import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    shiftNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startCash: {
      type: Number,
      required: true,
      default: 0,
    },
    endCash: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;
