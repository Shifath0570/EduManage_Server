const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

const { getNotices, getNoticeById, createNotice, deleteNotice, updateNotice } = require('../controllers/noticeController');



// Public route to get all notices
router.get('/', getNotices);
router.get('/:id', getNoticeById);
router.delete('/:id', deleteNotice);
router.post('/', createNotice); 
router.put('/:id', updateNotice); 




module.exports = router;