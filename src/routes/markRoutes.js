const express = require('express');
const router = express.Router();
const { saveMarks, getMarks } = require('../controllers/markController');

router.post('/', saveMarks);
router.get('/', getMarks);

module.exports = router;
