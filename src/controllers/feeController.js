const Student = require("../models/Student.js");
const FeeCollection = require("../models/FeeCollection.js");
const CLASS_FEES = require("../config/feeStructure.js");

exports.getStudentFeeStatus = async (req, res) => {
  try {
    const { 
      search, 
      className, 
      section, 
      paymentStatus, 
      startDate, 
      endDate,
      page = 1,
      limit = 10 
    } = req.query;

    const studentMatch = {};
    if (search) {
      studentMatch.$or = [
        { studentId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (className) studentMatch.className = className;
    if (section) studentMatch.section = section;

    const pipeline = [
      { $match: studentMatch },
      {
        $lookup: {
          from: "FeeCollections",
          localField: "studentId",
          foreignField: "studentId",
          as: "paymentHistory",
        },
      },
    ];

    // Build MongoDB aggregation date filter conditions without boolean literals
    if (startDate || endDate) {
      const conditions = [];
      if (startDate) {
        conditions.push({ $gte: ["$$payment.paymentDate", new Date(startDate)] });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push({ $lte: ["$$payment.paymentDate", end] });
      }

      pipeline.push({
        $project: {
          studentId: 1,
          name: 1,
          roll: 1,
          className: 1,
          section: 1,
          phone: 1,
          status: 1,
          paymentHistory: {
            $filter: {
              input: "$paymentHistory",
              as: "payment",
              cond: conditions.length > 1 ? { $and: conditions } : conditions[0],
            },
          },
        },
      });
    }

    const students = await Student.aggregate(pipeline);

    let processedRecords = students.map((student) => {
      const totalFee = CLASS_FEES[student.className] || 0;
      const totalPaid = (student.paymentHistory || []).reduce(
        (sum, payment) => sum + payment.paidAmount, 
        0
      );
      const dueAmount = Math.max(0, totalFee - totalPaid);

      let computedStatus = "Unpaid";
      if (totalPaid >= totalFee && totalFee > 0) {
        computedStatus = "Paid";
      } else if (totalPaid > 0 && totalPaid < totalFee) {
        computedStatus = "Partial";
      }

      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        roll: student.roll,
        className: student.className,
        section: student.section,
        phone: student.phone,
        status: student.status,
        totalFee,
        totalPaid,
        dueAmount,
        paymentStatus: computedStatus,
        paymentHistory: student.paymentHistory || [],
      };
    });

    if (paymentStatus) {
      processedRecords = processedRecords.filter(
        (record) => record.paymentStatus.toLowerCase() === paymentStatus.toLowerCase()
      );
    }

    const summary = processedRecords.reduce(
      (acc, record) => {
        acc.totalExpectedFees += record.totalFee;
        acc.totalPaidFees += record.totalPaid;
        acc.totalDueFees += record.dueAmount;
        return acc;
      },
      { totalExpectedFees: 0, totalPaidFees: 0, totalDueFees: 0 }
    );

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const totalRecords = processedRecords.length;
    const totalPages = Math.ceil(totalRecords / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRecords = processedRecords.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      count: paginatedRecords.length,
      pagination: {
        totalRecords,
        currentPage: pageNum,
        totalPages,
      },
      summary,
      data: paginatedRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching fee records",
      error: error.message,
    });
  }
};

exports.collectFee = async (req, res) => {
  try {
    const { studentId, paidAmount, paymentMethod, remarks } = req.body;

    if (!studentId || paidAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "studentId and paidAmount are required",
      });
    }

    const newPayment = await FeeCollection.create({
      studentId,
      paidAmount,
      paymentMethod: paymentMethod || "Cash",
      remarks: remarks || "",
    });

    res.status(201).json({
      success: true,
      message: "Fee collected successfully",
      data: newPayment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing collection",
      error: error.message,
    });
  }
};