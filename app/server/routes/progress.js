const express = require('express');
const router = express.Router();
const { registerClient } = require('../utils/progressManager');

router.get('/', (req, res) => {
  registerClient(res);
});

module.exports = router;