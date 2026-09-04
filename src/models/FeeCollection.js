const mongoose = require("mongoose");

const feeCollectionSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true, // Index added for high-performance lookup
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true, // Index added for date range queries
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bkash", "Nagad", "Bank Transfer"],
      default: "Cash",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { 
    collection: "FeeCollections",
    timestamps: true 
  }
);

// Compound index for combined query optimization
feeCollectionSchema.index({ studentId: 1, paymentDate: -1 });

module.exports = mongoose.model("FeeCollection", feeCollectionSchema);