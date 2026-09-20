const express = require('express');
const router = express.Router();

const { verifyToken, authorize } = require('../middleware/auth');
const { getNotices, getNoticeById, createNotice, deleteNotice, updateNotice } = require('../controllers/noticeController');



router.get('/', getNotices);
router.get('/:id', getNoticeById);
router.delete('/:id', verifyToken, authorize(['admin']), deleteNotice);
router.post('/', verifyToken, authorize(['admin']), createNotice);
router.put('/:id', verifyToken, authorize(['admin']), updateNotice); 




module.exports = router;

