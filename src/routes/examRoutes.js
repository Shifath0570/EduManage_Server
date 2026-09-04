const express = require('express');
const router = express.Router();
const { getExams, getExamById, createExam, deleteExam } = require('../controllers/examController');

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.delete('/:id', deleteExam);

module.exports = router;
