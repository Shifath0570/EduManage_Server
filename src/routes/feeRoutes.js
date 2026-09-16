// routes/feeRoutes.js
const express = require("express");
const feeController = require("../controllers/feeController.js");

const router = express.Router();

router.get("/", feeController.getStudentFeeStatus);
router.get("/:id", feeController.getFeeById);
router.post("/collect", feeController.collectFee);

module.exports = router;