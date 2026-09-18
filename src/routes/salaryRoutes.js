const express = require("express");
const router = express.Router();
const {
  getTeacherSalaries,
  getTeacherSalariesById,
  payTeacherSalary,
} = require("../controllers/salaryController");

router.get("/", getTeacherSalaries);
router.post("/pay", payTeacherSalary);
router.get("/:id", getTeacherSalariesById);

module.exports = router;