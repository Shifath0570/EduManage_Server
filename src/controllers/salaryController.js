const SalaryPayment = require("../models/SalaryPayment");
const Teacher = require("../models/Teacher"); // Adjust path if needed

/**
 * @desc Get payroll data for active teachers with search, filter, and pagination
 * @route GET /api/salaries
 */
exports.getTeacherSalaries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, month, paymentStatus } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7); // Default to current month "YYYY-MM"

    // Filter active teachers
    let teacherFilter = { status: "Active" };

    if (search) {
      teacherFilter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const totalTeachers = await Teacher.countDocuments(teacherFilter);
    const teachers = await Teacher.find(teacherFilter)
      .skip(skip)
      .limit(limit)
      .lean();

    const teacherIds = teachers.map((t) => t._id);

    // Fetch payments made to these teachers for target month
    const payments = await SalaryPayment.find({
      teacherId: { $in: teacherIds },
      month: targetMonth,
    });

    const paymentMap = new Map(
      payments.map((p) => [p.teacherId.toString(), p])
    );

    // Map payroll records
    let payrollRecords = teachers.map((teacher) => {
      const payment = paymentMap.get(teacher._id.toString());
      const baseSalary = 15000;
      const paidAmount = payment ? payment.paidAmount : 0;
      const dueAmount = baseSalary - paidAmount;
      const status =
        paidAmount === 0 ? "Unpaid" : dueAmount === 0 ? "Paid" : "Partial";

      return {
        _id: teacher._id,
        teacherId: teacher.teacherId,
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        profilePhoto: teacher.profilePhoto,
        subjectSpecialization: teacher.subjectSpecialization,
        baseSalary,
        paidAmount,
        dueAmount,
        paymentStatus: status,
        lastPaymentDetails: payment || null,
      };
    });

    // Post-filter by status if requested
    if (paymentStatus) {
      payrollRecords = payrollRecords.filter(
        (r) => r.paymentStatus === paymentStatus
      );
    }

    // Aggregated metrics calculation
    const totalActiveCount = await Teacher.countDocuments({ status: "Active" });
    const monthPayments = await SalaryPayment.find({ month: targetMonth });
    const totalPaidSalary = monthPayments.reduce(
      (acc, curr) => acc + curr.paidAmount,
      0
    );
    const totalExpectedSalary = totalActiveCount * 15000;
    const totalDueSalary = totalExpectedSalary - totalPaidSalary;

    res.status(200).json({
      success: true,
      summary: {
        totalExpectedSalary,
        totalPaidSalary,
        totalDueSalary,
        totalActiveTeachers: totalActiveCount,
      },
      pagination: {
        totalPages: Math.ceil(totalTeachers / limit),
        totalRecords: totalTeachers,
        currentPage: page,
      },
      data: payrollRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Process salary payment or partial update
 * @route POST /api/salaries/pay
 */
exports.payTeacherSalary = async (req, res) => {
  try {
    const { teacherId, amount, paymentMethod, remarks, month } = req.body;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    if (!teacherId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "teacherId, amount, and paymentMethod are required.",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher record not found" });
    }

    let paymentRecord = await SalaryPayment.findOne({
      teacherId,
      month: targetMonth,
    });

    if (paymentRecord) {
      const newPaidAmount = paymentRecord.paidAmount + Number(amount);
      if (newPaidAmount > 15000) {
        return res.status(400).json({
          success: false,
          message: "Payment exceeds monthly base salary of 15,000 TK.",
        });
      }

      paymentRecord.paidAmount = newPaidAmount;
      paymentRecord.paymentMethod = paymentMethod;
      paymentRecord.remarks = remarks || paymentRecord.remarks;
      paymentRecord.status = newPaidAmount >= 15000 ? "Paid" : "Partial";
      await paymentRecord.save();
    } else {
      if (Number(amount) > 15000) {
        return res.status(400).json({
          success: false,
          message: "Payment exceeds monthly base salary of 15,000 TK.",
        });
      }

      paymentRecord = await SalaryPayment.create({
        teacherId: teacher._id,
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        month: targetMonth,
        baseSalary: 15000,
        paidAmount: Number(amount),
        paymentMethod,
        remarks: remarks || "",
        status: Number(amount) >= 15000 ? "Paid" : "Partial",
      });
    }

    res.status(200).json({
      success: true,
      message: "Salary payment processed successfully",
      data: paymentRecord,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};