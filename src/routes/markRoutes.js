const express = require('express');
const router = express.Router();
const { saveMarks, getMarks, getStudentResults } = require('../controllers/markController');

router.get('/my-results', getStudentResults);
router.get('/student', getStudentResults);
router.get('/student/:identifier', getStudentResults);

router.post('/', saveMarks);
router.get('/', getMarks);

module.exports = router;
