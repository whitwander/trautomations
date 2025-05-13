const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ logs: global.logs || [] });
});

module.exports = router;

console.log("oi")