const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getTeacherSalaries,
  getTeacherSalariesById,
  payTeacherSalary,
} = require("../controllers/salaryController");

router.get("/", verifyToken, authorize('admin', 'teacher'), getTeacherSalaries);
router.post("/pay", verifyToken, authorize('admin'), payTeacherSalary);
router.get("/:id", verifyToken, authorize('admin', 'teacher'), getTeacherSalariesById);

module.exports = router;