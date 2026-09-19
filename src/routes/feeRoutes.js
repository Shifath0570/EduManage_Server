// routes/feeRoutes.js
const express = require("express");
const feeController = require("../controllers/feeController.js");
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get("/", verifyToken, authorize('admin'), feeController.getStudentFeeStatus);
router.get("/:id", verifyToken, authorize('admin', 'student'), feeController.getFeeById);
router.post("/collect", verifyToken, authorize('admin'), feeController.collectFee);

module.exports = router;