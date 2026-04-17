const express = require('express');
const router = express.Router();

const webhookRoutes = require('./webhook');
const apiRoutes = require('./api');

router.use('/webhook', webhookRoutes);
router.use('/api', apiRoutes);

module.exports = router;
