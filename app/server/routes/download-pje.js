const express = require('express');
const router = express.Router();
const { pjeOutput } = require('../utils/outputFile');

router.get('/', (req, res) => {
    res.download(pjeOutput, 'resultados.csv', (err) => {
        if (err) {
            res.status(500).send({ error: 'Erro ao baixar o arquivo' });
        }
    });
});

module.exports = router;