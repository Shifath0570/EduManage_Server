// routes/feeRoutes.js
const express = require("express");
const feeController = require("../controllers/feeController.js");

const router = express.Router();

router.get("/", feeController.getStudentFeeStatus);
router.post("/collect", feeController.collectFee);

module.exports = router;