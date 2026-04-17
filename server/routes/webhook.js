const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/WebhookController');

// Rota POST que a Evolution disparará
router.post('/evolution', WebhookController.handleEvolutionAPI);

module.exports = router;
