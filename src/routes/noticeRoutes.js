const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const { getNotices, getNoticeById, createNotice, deleteNotice } = require('../controllers/noticeController');



// Public route to get all notices
router.get('/', getNotices);
router.get('/:id', getNoticeById);
router.delete('/:id', verifyToken, deleteNotice);
router.post('/', verifyToken, createNotice); 




module.exports = router;