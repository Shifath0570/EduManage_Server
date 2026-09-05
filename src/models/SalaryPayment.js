const mongoose = require("mongoose");

const salaryPaymentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: String,
      required: true, // Format: "YYYY-MM" (e.g., "2026-09")
      trim: true,
    },
    baseSalary: {
      type: Number,
      default: 15000,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: [1, "Payment amount must be greater than 0"],
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bkash", "Nagad", "Bank Transfer"],
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Paid", "Partial"],
      default: "Paid",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { collection: "TeacherSalaryPayments", timestamps: true }
);

// Compound index to quickly fetch/prevent duplicates per teacher per month
salaryPaymentSchema.index({ teacherId: 1, month: 1 });

module.exports = mongoose.model("SalaryPayment", salaryPaymentSchema);