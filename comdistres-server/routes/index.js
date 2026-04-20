const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/reports', require('./reports'));
router.use('/users', require('./users'));

module.exports = router;
