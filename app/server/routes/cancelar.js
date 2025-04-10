const express = require('express');
const router = express.Router();
const { setCancelFlag, logMessage } = require('../utils/extrairUtils');

router.post('/', (req, res) => {
    setCancelFlag(true);
    logMessage('Processamento cancelado pelo usuário.');
    res.status(200).json({ message: 'Processamento cancelado.' });
});

module.exports = router;
