const mongoose = require("mongoose");
const Student = require("../models/Student.js");
const FeeCollection = require("../models/FeeCollection.js");
const CLASS_FEES = require("../config/feeStructure.js");

const ensureDatabaseReady = (res) => {
  if (mongoose.connection.readyState === 0) {
    return res.status(503).json({
      success: false,
      message: "Database is not connected. Please configure MONGODB_URI and restart the server.",
    });
  }

  return null;
};

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
          let: {
            studentDBId: "$_id",
            studentId: "$studentId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$studentDBId", "$$studentDBId"] },
                    { $eq: ["$studentId", "$$studentId"] },
                  ],
                },
              },
            },
          ],
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
          profileImage: 1,
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
        profileImage: student.profileImage,
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

// Get Fee Record by Student ID or MongoDB ObjectId
exports.getFeeById = async (req, res) => {
  try {
    const dbCheck = ensureDatabaseReady(res);
    if (dbCheck) return dbCheck;

    const { id } = req.params;

    // Check if ID is a valid MongoDB ObjectId or custom String studentId
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    const query = isObjectId
      ? { $or: [{ _id: id }, { studentId: id }, { stuId: id }] }
      : { studentId: id };

    const student = await Student.findOne(query).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found for this id.",
      });
    }

    // 2. Fetch full payment history for this student
    const paymentHistory = await FeeCollection.find({
      $or: [
        { studentDBId: student._id },
        { studentId: student.studentId },
      ],
    })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // 3. Compute fee metrics dynamically
    const totalFee = CLASS_FEES[student.className] || 0;
    const totalPaid = paymentHistory.reduce(
      (sum, payment) => sum + (payment.paidAmount || 0),
      0
    );
    const dueAmount = Math.max(0, totalFee - totalPaid);

    let paymentStatus = "Unpaid";
    if (totalPaid >= totalFee && totalFee > 0) {
      paymentStatus = "Paid";
    } else if (totalPaid > 0 && totalPaid < totalFee) {
      paymentStatus = "Partial";
    }

    // 4. Construct response matching the frontend FeeData interface
    const responseData = {
      _id: student._id,
      studentId: student.studentId,
      name: student.name,
      roll: student.roll || "N/A",
      className: student.className || "",
      section: student.section || "",
      phone: student.phone || "",
      profileImage: student.profileImage || "",
      status: student.status || "Active",
      totalFee,
      totalPaid,
      dueAmount,
      paymentStatus,
      paymentHistory,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching fee record",
      error: error.message,
    });
  }
};

exports.collectFee = async (req, res) => {
  try {
    const dbCheck = ensureDatabaseReady(res);
    if (dbCheck) return dbCheck;

    const { studentDBId, studentId, paidAmount, paymentMethod, remarks } = req.body;

    if ((!studentDBId && !studentId) || paidAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "studentDBId or studentId and paidAmount are required",
      });
    }

    const studentQuery = studentDBId && mongoose.Types.ObjectId.isValid(studentDBId)
      ? { _id: studentDBId }
      : { studentId };
    const student = await Student.findOne(studentQuery).select("_id studentId").lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found for this id.",
      });
    }

    const newPayment = await FeeCollection.create({
      studentDBId: student._id,
      studentId: student.studentId,
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