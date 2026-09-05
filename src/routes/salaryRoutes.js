const express = require("express");
const router = express.Router();
const {
  getTeacherSalaries,
  payTeacherSalary,
} = require("../controllers/salaryController");

router.get("/", getTeacherSalaries);
router.post("/pay", payTeacherSalary);

module.exports = router;